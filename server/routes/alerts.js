// ============================================================
// routes/alerts.js — Alert listing and resolution
// ============================================================

import { Router } from 'express';
import { AlertService } from '../alerts/alertService.js';

const router = Router();

// GET /api/alerts — active alerts
router.get('/', (req, res) => {
  try {
    const alerts = req.query.all === 'true'
      ? AlertService.findAll()
      : AlertService.findActive();
    res.json({ data: alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts/:id
router.get('/:id', (req, res) => {
  try {
    const alert = AlertService.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ data: alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts/:id/resolve
router.post('/:id/resolve', (req, res) => {
  try {
    const alert = AlertService.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    const resolved = AlertService.resolve(req.params.id);
    res.json({ data: resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
