// ============================================================
// server/index.js — Express app + cron scheduler
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';

// Import DB first to create schema
import './db/database.js';

import workflowsRouter from './routes/workflows.js';
import executionsRouter from './routes/executions.js';
import incidentsRouter from './routes/incidents.js';
import alertsRouter from './routes/alerts.js';
import demoRouter from './routes/demo.js';
import { runAllMonitoring } from './engine/monitoringEngine.js';
import { WorkflowModel } from './models/workflow.js';
import { ExecutionModel } from './models/execution.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '1mb' }));

// ── Request logging ───────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/workflows', workflowsRouter);
app.use('/api/workflows/:id/executions', executionsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/demo', demoRouter);

// ── Webhook endpoint (generic ingestion) ─────────────────────
// POST /api/webhook/:workflowId
// Body: { status, outputCount, note, outputSummary }
// Optional: Authorization: Bearer <WEBHOOK_SECRET>
app.post('/api/webhook/:workflowId', async (req, res) => {
  try {
    // Basic auth check
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const auth = req.headers.authorization ?? '';
      if (auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Invalid webhook secret' });
      }
    }

    const wf = WorkflowModel.findById(req.params.workflowId);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });

    const now = new Date().toISOString();
    const status = req.body.status ?? 'success';
    const validStatuses = ['success', 'failed', 'success_silent_fail', 'success_anomaly'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const exec = ExecutionModel.create({
      workflowId: req.params.workflowId,
      status,
      startedAt: req.body.startedAt ?? now,
      completedAt: req.body.completedAt ?? now,
      durationMs: req.body.durationMs ?? null,
      outputSummary: req.body.outputSummary ?? null,
      outputCount: req.body.outputCount ?? 0,
      note: req.body.note ?? null,
    });

    const { runMonitoring } = await import('./engine/monitoringEngine.js');
    const monitoring = await runMonitoring(req.params.workflowId);

    res.status(201).json({ received: true, execution: exec.id, monitoring });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Integration status — never exposes the actual secret values, only
// whether each channel is configured, so the UI can show real status
// without needing to handle credentials itself. ───────────────────────
app.get('/api/settings/status', (_req, res) => {
  res.json({
    data: {
      email: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.ALERT_EMAIL_TO),
      slack: Boolean(process.env.SLACK_WEBHOOK_URL),
      discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
      ai: Boolean(process.env.ANTHROPIC_API_KEY),
    },
  });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] 🚀 AutoHealth API running on http://localhost:${PORT}`);
  console.log(`[Server] Monitoring engine ready`);
});

// ── Cron: Run monitoring engine every minute ──────────────────
// Checks all workflows for inactivity and anomalies on schedule
cron.schedule('* * * * *', async () => {
  console.log('[Cron] Running scheduled monitoring check...');
  try {
    const results = await runAllMonitoring();
    const issues = results.filter(r => r.status !== 'healthy' && r.status !== 'error');
    if (issues.length > 0) {
      console.log(`[Cron] ⚠️  ${issues.length} workflow(s) with issues: ${issues.map(r => r.name).join(', ')}`);
    } else {
      console.log(`[Cron] ✅ All ${results.length} workflows healthy`);
    }
  } catch (err) {
    console.error('[Cron] Error during monitoring:', err.message);
  }
});

export default app;
