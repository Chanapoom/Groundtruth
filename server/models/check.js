// ============================================================
// models/check.js — Check (monitoring rule) operations
// ============================================================

import { db } from '../db/database.js';
import { randomUUID } from 'crypto';

export const CheckModel = {

  findByWorkflow(workflowId) {
    return db.prepare(`SELECT * FROM checks WHERE workflow_id = ? ORDER BY created_at ASC`).all(workflowId);
  },

  create(data) {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO checks (id, workflow_id, type, label, configuration, enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.workflowId, data.type, data.label, JSON.stringify(data.configuration ?? {}), data.enabled ? 1 : 0);
    return db.prepare('SELECT * FROM checks WHERE id = ?').get(id);
  },

  updateResult(id, result, reason = null) {
    db.prepare(`UPDATE checks SET last_result = ?, last_reason = ? WHERE id = ?`)
      .run(result, reason, id);
  },

  // Create default checks for a new workflow
  createDefaults(workflowId) {
    const defaults = [
      { type: 'execution_check', label: 'Ran within expected window', config: {} },
      { type: 'output_check',    label: 'Expected output exists',     config: { field: 'output_count', min: 1 } },
      { type: 'data_validation', label: 'Required fields present',    config: { type: 'not_empty' } },
      { type: 'anomaly',         label: 'Volume within normal range', config: { threshold: 0.5 } },
    ];
    for (const d of defaults) {
      this.create({ workflowId, type: d.type, label: d.label, configuration: d.config, enabled: true });
    }
  },

  deleteByWorkflow(workflowId) {
    db.prepare('DELETE FROM checks WHERE workflow_id = ?').run(workflowId);
  },
};
