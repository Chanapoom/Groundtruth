// ============================================================
// models/incident.js — Incident operations
// ============================================================

import { db } from '../db/database.js';
import { randomUUID } from 'crypto';

export const IncidentModel = {

  findActive() {
    return db.prepare(`
      SELECT i.*, w.name AS workflow_name
      FROM incidents i
      JOIN workflows w ON w.id = i.workflow_id
      WHERE i.status = 'active'
      ORDER BY i.detected_at DESC
    `).all().map(parseIncident);
  },

  findByWorkflow(workflowId) {
    return db.prepare(`
      SELECT * FROM incidents WHERE workflow_id = ?
      ORDER BY detected_at DESC
    `).all(workflowId).map(parseIncident);
  },

  findAll() {
    return db.prepare(`
      SELECT i.*, w.name AS workflow_name
      FROM incidents i
      JOIN workflows w ON w.id = i.workflow_id
      ORDER BY i.detected_at DESC
    `).all().map(parseIncident);
  },

  findById(id) {
    const row = db.prepare(`
      SELECT i.*, w.name AS workflow_name
      FROM incidents i
      JOIN workflows w ON w.id = i.workflow_id
      WHERE i.id = ?
    `).get(id);
    return row ? parseIncident(row) : null;
  },

  create(data) {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO incidents (id, workflow_id, type, severity, message, evidence, ai_explanation, suggested_action, status, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      id, data.workflowId, data.type, data.severity, data.message,
      JSON.stringify(data.evidence ?? []),
      data.aiExplanation ?? null,
      data.suggestedAction ?? null,
      now
    );
    return this.findById(id);
  },

  // Overwrite the template explanation with a real, per-incident one once
  // the async AI call (server/ai/explainIncident.js) resolves. Only
  // updates rows that still exist — the incident may have auto-resolved
  // (or the workflow been deleted) by the time the AI response arrives.
  updateExplanation(id, aiExplanation, suggestedAction) {
    db.prepare(`
      UPDATE incidents SET ai_explanation = ?, suggested_action = ? WHERE id = ?
    `).run(aiExplanation, suggestedAction, id);
    return this.findById(id);
  },

  resolve(id) {
    db.prepare(`
      UPDATE incidents SET status = 'resolved', resolved_at = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
    return this.findById(id);
  },

  // Check if active incident of this type already exists for workflow
  hasActive(workflowId, type) {
    const row = db.prepare(`
      SELECT id FROM incidents WHERE workflow_id = ? AND type = ? AND status = 'active' LIMIT 1
    `).get(workflowId, type);
    return !!row;
  },

  // Auto-resolve incidents when workflow becomes healthy
  resolveForWorkflow(workflowId, type) {
    db.prepare(`
      UPDATE incidents SET status = 'resolved', resolved_at = ?
      WHERE workflow_id = ? AND type = ? AND status = 'active'
    `).run(new Date().toISOString(), workflowId, type);
  },
};

function parseIncident(row) {
  return {
    ...row,
    evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : (row.evidence ?? []),
  };
}
