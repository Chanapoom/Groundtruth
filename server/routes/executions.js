// ============================================================
// routes/executions.js — Record and retrieve executions
// ============================================================

import { Router } from 'express';
import { ExecutionModel } from '../models/execution.js';
import { WorkflowModel } from '../models/workflow.js';
import { runMonitoring } from '../engine/monitoringEngine.js';
import { validate, required, isString, isIn } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

const VALID_STATUSES = ['success', 'failed', 'success_silent_fail', 'success_anomaly'];

// GET /api/workflows/:id/executions — execution history
router.get('/', (req, res) => {
  try {
    const wf = WorkflowModel.findById(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const execs = ExecutionModel.findByWorkflow(req.params.id, limit);
    res.json({ data: execs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows/:id/executions — record an execution
// This is the main ingestion endpoint (called by automation platforms or webhooks)
router.post('/',
  validate([
    required('status'),
    isIn('status', VALID_STATUSES),
  ]),
  async (req, res) => {
    try {
      const wf = WorkflowModel.findById(req.params.id);
      if (!wf) return res.status(404).json({ error: 'Workflow not found' });

      const now = new Date().toISOString();
      const exec = ExecutionModel.create({
        workflowId: req.params.id,
        status: req.body.status,
        startedAt: req.body.startedAt ?? now,
        completedAt: req.body.completedAt ?? now,
        durationMs: req.body.durationMs ?? null,
        inputSummary: req.body.inputSummary ?? null,
        outputSummary: req.body.outputSummary ?? null,
        outputCount: req.body.outputCount ?? 0,
        note: req.body.note ?? null,
      });

      // Automatically run monitoring after each execution
      const monitorResult = await runMonitoring(req.params.id);

      res.status(201).json({
        data: exec,
        monitoring: monitorResult,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
