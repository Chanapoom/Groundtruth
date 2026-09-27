// ============================================================
// routes/incidents.js — Incident listing and resolution
// ============================================================

import { Router } from 'express';
import { IncidentModel } from '../models/incident.js';
import { WorkflowModel } from '../models/workflow.js';
import { runMonitoring } from '../engine/monitoringEngine.js';
import { AlertService } from '../alerts/alertService.js';

const router = Router();

// GET /api/incidents — active incidents
router.get('/', (req, res) => {
  try {
    const incidents = req.query.all === 'true'
      ? IncidentModel.findAll()
      : IncidentModel.findActive();
    res.json({ data: incidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/:id — single incident
router.get('/:id', (req, res) => {
  try {
    const incident = IncidentModel.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ data: incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/incidents/:id/resolve — resolve incident
router.post('/:id/resolve', async (req, res) => {
  try {
    const incident = IncidentModel.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.status === 'resolved') {
      return res.status(400).json({ error: 'Incident already resolved' });
    }

    const resolved = IncidentModel.resolve(req.params.id);

    // Resolving an incident must resolve the alert it created too — the
    // two were tracked completely separately before this, so an alert
    // would sit "active" forever even after its incident was resolved.
    AlertService.resolveByIncident(req.params.id);

    // Re-run monitoring to recompute workflow status after resolution
    try { await runMonitoring(incident.workflow_id); } catch {}

    res.json({ data: resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
