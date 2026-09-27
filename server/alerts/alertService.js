// ============================================================
// alerts/alertService.js
// Creates actionable alerts from incidents.
// For MVP: alerts are stored in-memory and logged.
// In production: integrate with email/Slack/webhook.
// ============================================================

import { db } from '../db/database.js';
import { randomUUID } from 'crypto';
import { sendAlertEmail } from './mailer.js';
import { sendSlackAlert, sendDiscordAlert } from './chatNotify.js';

// ── Ensure alerts table exists ────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id          TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    workflow_name TEXT NOT NULL,
    type        TEXT,
    severity    TEXT NOT NULL,
    problem     TEXT NOT NULL,
    evidence    TEXT NOT NULL DEFAULT '[]',
    suggested_action TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK(status IN ('active', 'resolved')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status, created_at DESC);
`);

// Migrate older databases created before the `type` column existed.
const alertColumns = db.prepare(`PRAGMA table_info(alerts)`).all().map(c => c.name);
if (!alertColumns.includes('type')) {
  db.exec(`ALTER TABLE alerts ADD COLUMN type TEXT`);
}

export const AlertService = {

  createFromIncident(incident, workflowName) {
    if (!incident) return null;
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR IGNORE INTO alerts
        (id, incident_id, workflow_id, workflow_name, type, severity, problem, evidence, suggested_action, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      id,
      incident.id,
      incident.workflow_id,
      workflowName,
      incident.type ?? null,
      incident.severity,
      incident.message,
      JSON.stringify(incident.evidence ?? []),
      incident.suggested_action ?? null,
      now
    );

    console.log(`[Alert] 🔔 ${incident.severity.toUpperCase()}: ${workflowName} — ${incident.message}`);
    const alert = this.findById(id);
    sendAlertEmail(alert).catch((err) => console.error('[Mailer] Unexpected error:', err.message));
    sendSlackAlert(alert).catch((err) => console.error('[Slack] Unexpected error:', err.message));
    sendDiscordAlert(alert).catch((err) => console.error('[Discord] Unexpected error:', err.message));
    return alert;
  },

  findActive() {
    return db.prepare(`
      SELECT * FROM alerts WHERE status = 'active' ORDER BY created_at DESC
    `).all().map(parseAlert);
  },

  findAll() {
    return db.prepare(`
      SELECT * FROM alerts ORDER BY created_at DESC
    `).all().map(parseAlert);
  },

  findById(id) {
    const row = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
    return row ? parseAlert(row) : null;
  },

  resolve(id) {
    db.prepare(`
      UPDATE alerts SET status = 'resolved', resolved_at = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
    return this.findById(id);
  },

  // Resolve all alerts for a workflow (when incidents auto-resolve)
  resolveForWorkflow(workflowId) {
    db.prepare(`
      UPDATE alerts SET status = 'resolved', resolved_at = ?
      WHERE workflow_id = ? AND status = 'active'
    `).run(new Date().toISOString(), workflowId);
  },

  // Resolve the alert(s) created from a specific incident. Resolving an
  // incident must resolve its alert too — otherwise the alert sits active
  // forever even after the incident that created it is marked resolved.
  resolveByIncident(incidentId) {
    db.prepare(`
      UPDATE alerts SET status = 'resolved', resolved_at = ?
      WHERE incident_id = ? AND status = 'active'
    `).run(new Date().toISOString(), incidentId);
  },

  // Update the suggested action shown on an alert once a real AI
  // explanation arrives after the alert was already created from the
  // template text (see server/ai/explainIncident.js).
  updateSuggestedActionByIncident(incidentId, suggestedAction) {
    db.prepare(`
      UPDATE alerts SET suggested_action = ? WHERE incident_id = ?
    `).run(suggestedAction, incidentId);
  },

  // Resolve active alerts of one type for a workflow — the alert-side
  // equivalent of IncidentModel.resolveForWorkflow(workflowId, type), used
  // wherever the monitoring engine auto-resolves an incident type (e.g. a
  // late workflow runs again). Scoped by type so resolving "inactivity"
  // doesn't also clear an unrelated "anomaly" alert on the same workflow.
  resolveForWorkflowType(workflowId, type) {
    db.prepare(`
      UPDATE alerts SET status = 'resolved', resolved_at = ?
      WHERE workflow_id = ? AND type = ? AND status = 'active'
    `).run(new Date().toISOString(), workflowId, type);
  },

  // Permanently remove alerts for a workflow. Unlike incidents/executions/
  // checks, alerts have no DB-level foreign key cascade to workflows, so
  // deleting a workflow must explicitly clean these up too.
  deleteByWorkflow(workflowId) {
    db.prepare(`DELETE FROM alerts WHERE workflow_id = ?`).run(workflowId);
  },
};

function parseAlert(row) {
  return {
    ...row,
    evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : (row.evidence ?? []),
  };
}
