// ============================================================
// engine/monitoringEngine.js
// Orchestrates all 4 monitoring layers for a single workflow.
// Computes final status, updates checks, creates/resolves incidents.
// ============================================================

import { WorkflowModel } from '../models/workflow.js';
import { CheckModel } from '../models/check.js';
import { IncidentModel } from '../models/incident.js';
import { ExecutionModel } from '../models/execution.js';
import { checkHeartbeat } from './layer1-heartbeat.js';
import { checkOutput } from './layer2-output.js';
import { checkValidation } from './layer3-validation.js';
import { checkAnomaly } from './layer4-anomaly.js';
import { AlertService } from '../alerts/alertService.js';
import { generateExplanation } from '../ai/explainIncident.js';

// Fire off a real AI explanation for a freshly created incident, in the
// background — never blocks incident creation on a network call, and
// silently does nothing if ANTHROPIC_API_KEY isn't configured (see
// server/ai/explainIncident.js). Overwrites the deterministic template
// text with a real, per-incident one once it resolves.
function attachAiExplanation(incident, workflow) {
  generateExplanation({ incident, workflow })
    .then((result) => {
      if (!result) return;
      IncidentModel.updateExplanation(incident.id, result.explanation, result.suggestedAction);
      AlertService.updateSuggestedActionByIncident(incident.id, result.suggestedAction);
    })
    .catch((err) => console.error('[AI] Unexpected error:', err.message));
}

// Resolving an incident type for a workflow must resolve its alert(s) too —
// these are two separate tables with no DB-level link, so every auto-resolve
// path below has to do both explicitly or the alert is left active forever
// even after the incident it came from is marked resolved.
function resolveType(workflowId, type) {
  IncidentModel.resolveForWorkflow(workflowId, type);
  AlertService.resolveForWorkflowType(workflowId, type);
}

/**
 * Run all monitoring layers for a single workflow.
 * Updates workflow status, check results, and incidents.
 *
 * @param {string} workflowId
 * @returns {{ status: string, issues: string[] }}
 */
export async function runMonitoring(workflowId) {
  const workflow = WorkflowModel.findById(workflowId);
  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  const checks = CheckModel.findByWorkflow(workflowId).filter(c => c.enabled);
  const issues = [];
  let isInactive = false;
  let hasTechnicalFailure = false;
  let hasSilentFailure = false;
  let hasAnomaly = false;

  // ── Layer 0: Coverage — is anything actually being checked? ────
  // A workflow with zero enabled checks isn't "healthy" — it's simply
  // not being watched. Silence here would be the same blind spot this
  // product exists to close, just one level up, so flag it explicitly
  // instead of defaulting to "healthy" by omission.
  if (checks.length === 0) {
    if (!IncidentModel.hasActive(workflowId, 'unmonitored')) {
      const inc = IncidentModel.create({
        workflowId,
        type: 'unmonitored',
        severity: 'medium',
        message: 'This workflow has no active monitoring checks. Groundtruth cannot tell whether it is working correctly.',
        evidence: [
          'Enabled checks: 0',
          `Workflow: ${workflow.name} on ${workflow.platform}`,
        ],
        aiExplanation: 'No heartbeat, output, validation, or anomaly checks are enabled for this workflow, so none of the monitoring layers can run. This is a coverage gap, not a confirmed failure — the workflow could be working fine or could be failing silently, and there is currently no way to tell which.',
        suggestedAction: 'Add or re-enable at least one monitoring check for this workflow so Groundtruth has something to verify against.',
      });
      AlertService.createFromIncident(inc, workflow.name);
      attachAiExplanation(inc, workflow);
    }
    WorkflowModel.updateStatus(workflowId, 'warning');
    return { status: 'warning', issues: ['No active monitoring checks configured.'] };
  }
  resolveType(workflowId, 'unmonitored');

  // ── Layer 1: Heartbeat (timing only — did it run on schedule?) ──
  const heartbeatCheck = checks.find(c => c.type === 'execution_check');
  if (heartbeatCheck) {
    const result = checkHeartbeat(workflow);
    CheckModel.updateResult(heartbeatCheck.id, result.passed ? 'passed' : 'failed', result.reason);
    if (!result.passed) {
      isInactive = true;
      issues.push(result.reason);
    }
  }

  // ── Technical failure — checked independently of timing ────────
  // checkHeartbeat only measures whether a run happened on schedule, so a
  // report that arrives ON TIME with status "failed" would otherwise never
  // be flagged (the timing check passes, and used to auto-resolve any
  // existing failure incident). A reported failure is a failure regardless
  // of how promptly it was reported.
  const latestExecution = ExecutionModel.getLatest(workflowId);
  hasTechnicalFailure = latestExecution?.status === 'failed';

  if (hasTechnicalFailure) {
    issues.push(`Last execution failed: ${latestExecution.note ?? 'no error details provided'}`);
    if (!IncidentModel.hasActive(workflowId, 'technical_failure')) {
      const inc = IncidentModel.create({
        workflowId,
        type: 'technical_failure',
        severity: 'critical',
        message: `Workflow is failing with a technical error.`,
        evidence: [
          `Last execution status: FAILED`,
          `Error note: ${latestExecution.note ?? 'Unknown error'}`,
          `Time: ${new Date(latestExecution.started_at).toLocaleString()}`,
        ],
        aiExplanation: 'The workflow is encountering a technical error preventing completion. Check the platform logs for the specific error and verify all API connections and credentials are valid.',
        suggestedAction: 'Review the error in your automation platform, check API credentials, and test the workflow manually.',
      });
      AlertService.createFromIncident(inc, workflow.name);
      attachAiExplanation(inc, workflow);
    }
  } else {
    resolveType(workflowId, 'technical_failure');
  }

  // ── Inactivity — only when a stale run isn't already explained by a
  // technical failure (avoid firing two incidents for the same root cause) ─
  if (isInactive && !hasTechnicalFailure) {
    if (!IncidentModel.hasActive(workflowId, 'inactivity')) {
      const inc = IncidentModel.create({
        workflowId,
        type: 'inactivity',
        severity: 'high',
        message: `Workflow has not run within its expected window. ${issues[0]}`,
        evidence: [
          issues[0],
          `Expected frequency: every ${workflow.expected_frequency_minutes} minutes`,
          `Workflow: ${workflow.name} on ${workflow.platform}`,
        ],
        aiExplanation: 'The workflow stopped executing without generating an error. This could be caused by a trigger misconfiguration, a disabled workflow, or a webhook that stopped receiving events.',
        suggestedAction: `Check if the workflow is still active on ${workflow.platform} and verify the trigger source.`,
      });
      AlertService.createFromIncident(inc, workflow.name);
      attachAiExplanation(inc, workflow);
    }
  } else if (!isInactive) {
    resolveType(workflowId, 'inactivity');
  }

  // ── Layer 2: Output Checks ────────────────────────────────────
  const outputChecks = checks.filter(c => c.type === 'output_check');
  for (const check of outputChecks) {
    const result = checkOutput(workflow, check);
    if (result.passed === null) {
      CheckModel.updateResult(check.id, null, result.reason);
      continue;
    }
    CheckModel.updateResult(check.id, result.passed ? 'passed' : 'failed', result.reason);
    if (!result.passed) {
      hasSilentFailure = true;
      issues.push(result.reason);
    }
  }

  if (hasSilentFailure && !isInactive) {
    if (!IncidentModel.hasActive(workflowId, 'missing_output')) {
      const latest = ExecutionModel.getLatest(workflowId);
      const inc = IncidentModel.create({
        workflowId,
        type: 'missing_output',
        severity: 'high',
        message: `Workflow completed successfully (technical), but expected output is missing. This is a silent failure.`,
        evidence: [
          `Execution status: ${latest?.status?.toUpperCase() ?? 'UNKNOWN'}`,
          `Output count: ${latest?.output_count ?? 0}`,
          `Expected: at least 1 output item`,
          issues.join(' | '),
        ],
        aiExplanation: 'The workflow appears to run without errors, but the output step is silently failing. This is the most dangerous type of failure because standard monitoring would consider this workflow healthy.',
        suggestedAction: 'Check the output step configuration in your automation platform and verify the upstream data source is returning records.',
      });
      AlertService.createFromIncident(inc, workflow.name);
      attachAiExplanation(inc, workflow);
    }
  } else if (!hasSilentFailure) {
    resolveType(workflowId, 'missing_output');
    resolveType(workflowId, 'validation_failure');
  }

  // ── Layer 3: Data Validation ─────────────────────────────────
  const validationChecks = checks.filter(c => c.type === 'data_validation');
  let hasValidationFailure = false;
  for (const check of validationChecks) {
    const result = checkValidation(workflow, check);
    if (result.passed === null) {
      CheckModel.updateResult(check.id, null, result.reason);
      continue;
    }
    CheckModel.updateResult(check.id, result.passed ? 'passed' : 'failed', result.reason);
    if (!result.passed) {
      hasValidationFailure = true;
      issues.push(result.reason);
    }
  }

  if (hasValidationFailure && !hasSilentFailure && !isInactive) {
    if (!IncidentModel.hasActive(workflowId, 'validation_failure')) {
      const inc = IncidentModel.create({
        workflowId,
        type: 'validation_failure',
        severity: 'medium',
        message: `Output data validation failed. Required fields or data integrity checks did not pass.`,
        evidence: issues,
        aiExplanation: 'The workflow produced output, but the data does not meet the configured validation rules. This could indicate a schema change in the upstream data source or a logic error in the workflow.',
        suggestedAction: 'Review the output data structure and verify the validation rules still match the expected output format.',
      });
      AlertService.createFromIncident(inc, workflow.name);
      attachAiExplanation(inc, workflow);
    }
  }

  // ── Layer 4: Anomaly Detection ────────────────────────────────
  const anomalyCheck = checks.find(c => c.type === 'anomaly');
  if (anomalyCheck && !isInactive) {
    const result = checkAnomaly(workflow, anomalyCheck);
    if (result.passed !== null) {
      CheckModel.updateResult(anomalyCheck.id, result.passed ? 'passed' : 'failed', result.reason);
      if (!result.passed) {
        hasAnomaly = true;
        issues.push(result.reason);

        if (!IncidentModel.hasActive(workflowId, 'anomaly')) {
          const evidence = [`${result.reason}`];
          if (result.evidence) {
            if (result.evidence.current !== undefined) evidence.push(`Current output: ${result.evidence.current}`);
            if (result.evidence.baseline !== undefined) evidence.push(`30-day average: ${result.evidence.baseline}`);
            if (result.evidence.deviationPct !== undefined) evidence.push(`Deviation: ${result.evidence.deviationPct}%`);
          }
          const inc = IncidentModel.create({
            workflowId,
            type: 'anomaly',
            severity: 'medium',
            message: result.reason,
            evidence,
            aiExplanation: 'The workflow ran successfully and passed validation, but produced an unusual amount of output compared to its historical baseline. This pattern typically indicates an upstream data issue — the source system may be returning fewer or more records than expected.',
            suggestedAction: 'Check the upstream data source and verify no input filters or triggers have changed recently.',
          });
          AlertService.createFromIncident(inc, workflow.name);
          attachAiExplanation(inc, workflow);
        }
      } else {
        resolveType(workflowId, 'anomaly');
      }
    }
  }

  // ── Compute Final Status ─────────────────────────────────────
  let finalStatus = 'healthy';
  if (hasTechnicalFailure) {
    finalStatus = 'failed';
  } else if (isInactive) {
    finalStatus = 'inactive';
  } else if (hasSilentFailure || hasValidationFailure || hasAnomaly) {
    finalStatus = 'warning';
  }

  WorkflowModel.updateStatus(workflowId, finalStatus);

  return { status: finalStatus, issues };
}

/**
 * Run monitoring for ALL workflows.
 */
export async function runAllMonitoring() {
  const workflows = WorkflowModel.findAll();
  const results = [];
  for (const wf of workflows) {
    try {
      const result = await runMonitoring(wf.id);
      results.push({ workflowId: wf.id, name: wf.name, ...result });
    } catch (err) {
      console.error(`[Engine] Error monitoring ${wf.id}:`, err.message);
      results.push({ workflowId: wf.id, name: wf.name, status: 'error', issues: [err.message] });
    }
  }
  return results;
}
