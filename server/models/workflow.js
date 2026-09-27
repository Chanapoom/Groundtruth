// ============================================================
// models/workflow.js — Workflow database operations
// ============================================================

import { db } from '../db/database.js';
import { randomUUID } from 'crypto';

export const WorkflowModel = {

  findAll() {
    return db.prepare(`
      SELECT w.*,
        (SELECT COUNT(*) FROM incidents i WHERE i.workflow_id = w.id AND i.status = 'active') AS active_incident_count,
        (SELECT started_at FROM executions e WHERE e.workflow_id = w.id ORDER BY started_at DESC LIMIT 1) AS last_run_at,
        (SELECT started_at FROM executions e WHERE e.workflow_id = w.id AND e.status LIKE 'success%' ORDER BY started_at DESC LIMIT 1) AS last_success_at
      FROM workflows w
      ORDER BY w.created_at DESC
    `).all();
  },

  findById(id) {
    return db.prepare(`
      SELECT w.*,
        (SELECT started_at FROM executions e WHERE e.workflow_id = w.id ORDER BY started_at DESC LIMIT 1) AS last_run_at,
        (SELECT started_at FROM executions e WHERE e.workflow_id = w.id AND e.status LIKE 'success%' ORDER BY started_at DESC LIMIT 1) AS last_success_at
      FROM workflows w WHERE w.id = ?
    `).get(id);
  },

  create(data) {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO workflows (id, name, platform, description, expected_frequency_minutes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'healthy', ?, ?)
    `).run(id, data.name, data.platform ?? 'Other', data.description ?? null, data.expectedFrequencyMinutes ?? 60, now, now);
    return this.findById(id);
  },

  update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== undefined)                     { fields.push('name = ?');                        values.push(data.name); }
    if (data.platform !== undefined)                 { fields.push('platform = ?');                    values.push(data.platform); }
    if (data.description !== undefined)              { fields.push('description = ?');                 values.push(data.description); }
    if (data.expectedFrequencyMinutes !== undefined) { fields.push('expected_frequency_minutes = ?');  values.push(data.expectedFrequencyMinutes); }
    if (data.status !== undefined)                   { fields.push('status = ?');                      values.push(data.status); }
    if (fields.length === 0) return this.findById(id);
    fields.push('updated_at = ?');
    values.push(new Date().toISOString(), id);
    db.prepare(`UPDATE workflows SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM workflows WHERE id = ?').run(id);
  },

  updateStatus(id, status) {
    db.prepare(`UPDATE workflows SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, new Date().toISOString(), id);
  },
};
