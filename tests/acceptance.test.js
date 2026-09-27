// tests/acceptance.test.js
// MVP Acceptance Test (§13 of TASKS.md & PRODUCT_SPEC.md)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

// Use a temporary test DB
const TEST_DB_PATH = path.resolve(process.cwd(), './server/db/test_acceptance.db');
process.env.DB_PATH = TEST_DB_PATH;

describe('MVP Acceptance Test (§13)', () => {
  let dbModule;
  let WorkflowModel;
  let ExecutionModel;
  let CheckModel;
  let IncidentModel;
  let AlertService;
  let runMonitoring;

  beforeAll(async () => {
    // Clean up old test db if exists
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }

    dbModule = await import('../server/db/database.js');
    const wfMod = await import('../server/models/workflow.js');
    const exMod = await import('../server/models/execution.js');
    const chMod = await import('../server/models/check.js');
    const inMod = await import('../server/models/incident.js');
    const alMod = await import('../server/alerts/alertService.js');
    const monMod = await import('../server/engine/monitoringEngine.js');

    WorkflowModel = wfMod.WorkflowModel;
    ExecutionModel = exMod.ExecutionModel;
    CheckModel = chMod.CheckModel;
    IncidentModel = inMod.IncidentModel;
    AlertService = alMod.AlertService;
    runMonitoring = monMod.runMonitoring;
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  });

  it('passes §13 Silent Failure Acceptance Test Scenario', async () => {
    // Step 1: Create a workflow expected to run every 1 hour (60 mins)
    const wf = WorkflowModel.create({
      name: 'Hourly Email Dispatcher',
      platform: 'n8n',
      description: 'Dispatches customer emails every hour',
      expectedFrequencyMinutes: 60,
    });

    CheckModel.createDefaults(wf.id);

    // Step 2: Workflow runs and reports SUCCESS, but output_count is 0 (missing expected output)
    const now = new Date().toISOString();
    ExecutionModel.create({
      workflowId: wf.id,
      status: 'success', // Technical status = SUCCESS
      startedAt: now,
      completedAt: now,
      durationMs: 1200,
      outputCount: 0, // BUT business outcome = NO OUTPUT PRODUCED
      outputSummary: JSON.stringify({}),
      note: 'Execution completed but email step generated 0 emails',
    });

    // Step 3: Run monitoring engine
    const result = await runMonitoring(wf.id);

    // Step 4: Verify expectations (§13)
    // 1. Detect missing output
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(i => i.toLowerCase().includes('silent failure') || i.toLowerCase().includes('expected'))).toBe(true);

    // 2. Mark workflow as WARNING
    const updatedWf = WorkflowModel.findById(wf.id);
    expect(updatedWf.status).toBe('warning');

    // 3. Create an incident
    const activeIncidents = IncidentModel.findByWorkflow(wf.id).filter(i => i.status === 'active');
    expect(activeIncidents.length).toBe(1);
    const incident = activeIncidents[0];
    expect(incident.type).toBe('missing_output');

    // 4. Explain why the workflow is unhealthy (AI explanation + evidence)
    expect(incident.ai_explanation).toBeDefined();
    expect(incident.evidence.length).toBeGreaterThan(0);

    // 5. Generate an alert
    const activeAlerts = AlertService.findActive().filter(a => a.workflow_id === wf.id);
    expect(activeAlerts.length).toBe(1);
    expect(activeAlerts[0].problem).toContain('silent failure');
  });
});
