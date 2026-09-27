// ============================================================
// routes/workflows.js — Workflow CRUD + status endpoints
// ============================================================

import { Router } from 'express';
import { WorkflowModel } from '../models/workflow.js';
import { CheckModel } from '../models/check.js';
import { IncidentModel } from '../models/incident.js';
import { ExecutionModel } from '../models/execution.js';
import { runMonitoring } from '../engine/monitoringEngine.js';
import { validate, required, isString, isNumber, isIn } from '../middleware/validate.js';
import { AlertService } from '../alerts/alertService.js';

const router = Router();

// GET /api/workflows — list all with summary
router.get('/', (req, res) => {
  try {
    const workflows = WorkflowModel.findAll();
    // Attach active incidents for each workflow
    const result = workflows.map(wf => {
      const incidents = IncidentModel.findByWorkflow(wf.id).filter(i => i.status === 'active');
      const checks = CheckModel.findByWorkflow(wf.id);
      return { ...wf, activeIncidents: incidents, checks };
    });
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:id — single workflow with full detail
router.get('/:id', (req, res) => {
  try {
    const wf = WorkflowModel.findById(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    const incidents = IncidentModel.findByWorkflow(wf.id);
    const checks = CheckModel.findByWorkflow(wf.id);
    res.json({ data: { ...wf, incidents, checks } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows — create workflow
router.post('/',
  validate([
    required('name'), isString('name'),
    isNumber('expectedFrequencyMinutes'),
    isString('platform'),
  ]),
  (req, res) => {
    try {
      const wf = WorkflowModel.create(req.body);
      // Create default monitoring checks
      CheckModel.createDefaults(wf.id);
      res.status(201).json({ data: wf });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/workflows/:id — update workflow
router.put('/:id',
  validate([isString('name'), isNumber('expectedFrequencyMinutes')]),
  (req, res) => {
    try {
      const existing = WorkflowModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Workflow not found' });
      const updated = WorkflowModel.update(req.params.id, req.body);
      res.json({ data: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/workflows/:id — delete workflow
router.delete('/:id', (req, res) => {
  try {
    const existing = WorkflowModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });
    AlertService.deleteByWorkflow(req.params.id);
    WorkflowModel.delete(req.params.id);
    res.json({ message: 'Workflow deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:id/report?days=30 — reliability report for a period.
// Built for agencies/teams to show a client or stakeholder proof that a
// workflow actually did what it was supposed to, not just that it ran.
router.get('/:id/report', (req, res) => {
  try {
    const wf = WorkflowModel.findById(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });

    const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();
    const now = new Date().toISOString();

    const executions = ExecutionModel.findSince(wf.id, sinceIso);
    const totalExecutions = executions.length;
    const counts = {
      success: 0,
      success_silent_fail: 0,
      success_anomaly: 0,
      failed: 0,
    };
    for (const e of executions) {
      if (counts[e.status] !== undefined) counts[e.status]++;
    }
    // "Verified correct" = technically succeeded AND passed every check —
    // this is the number that matters, not raw technical success rate.
    const reliabilityScore = totalExecutions > 0
      ? Math.round((counts.success / totalExecutions) * 100)
      : null;

    const incidents = IncidentModel.findByWorkflow(wf.id)
      .filter(i => i.detected_at >= sinceIso)
      .map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        message: i.message,
        status: i.status,
        detected_at: i.detected_at,
        resolved_at: i.resolved_at,
        resolution_minutes: i.resolved_at
          ? Math.round((new Date(i.resolved_at) - new Date(i.detected_at)) / 60000)
          : null,
      }));

    res.json({
      data: {
        workflow: { id: wf.id, name: wf.name, platform: wf.platform, description: wf.description },
        period: { days, since: sinceIso, until: now },
        executions: {
          total: totalExecutions,
          verifiedCorrect: counts.success,
          silentFailures: counts.success_silent_fail,
          anomalies: counts.success_anomaly,
          technicalFailures: counts.failed,
        },
        reliabilityScore,
        incidents: {
          total: incidents.length,
          resolved: incidents.filter(i => i.status === 'resolved').length,
          open: incidents.filter(i => i.status === 'active').length,
          list: incidents,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows/:id/monitor — manually trigger monitoring
router.post('/:id/monitor', async (req, res) => {
  try {
    const existing = WorkflowModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });
    const result = await runMonitoring(req.params.id);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
