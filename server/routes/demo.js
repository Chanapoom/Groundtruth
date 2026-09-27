// ============================================================
// routes/demo.js — Load demo data on demand (for onboarding)
// ============================================================

import { Router } from 'express';
import { seedDemoData } from '../db/seedData.js';

const router = Router();

// POST /api/demo/seed — wipes current data and loads demo scenarios
router.post('/seed', (_req, res) => {
  try {
    const summary = seedDemoData();
    res.json({ data: summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
