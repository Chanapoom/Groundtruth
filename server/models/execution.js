// ============================================================
// models/execution.js — Execution database operations
// ============================================================

import { db } from '../db/database.js';
import { randomUUID } from 'crypto';

export const ExecutionModel = {

  findByWorkflow(workflowId, limit = 20) {
    return db.prepare(`
      SELECT * FROM executions
      WHERE workflow_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).all(workflowId, limit);
  },

  create(data) {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO executions
        (id, workflow_id, status, started_at, completed_at, duration_ms, input_summary, output_summary, output_count, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.workflowId,
      data.status ?? 'success',
      data.startedAt ?? now,
      data.completedAt ?? now,
      data.durationMs ?? null,
      data.inputSummary ? JSON.stringify(data.inputSummary) : null,
      data.outputSummary ? JSON.stringify(data.outputSummary) : null,
      data.outputCount ?? 0,
      data.note ?? null,
      now
    );
    return db.prepare('SELECT * FROM executions WHERE id = ?').get(id);
  },

  // Get recent stats for anomaly baseline (last N days).
  // Excludes `excludeExecutionId` (the run currently being evaluated) —
  // a baseline must be computed from history BEFORE the run it's judging,
  // otherwise that run pulls its own comparison point toward itself.
  getBaseline(workflowId, days = 30, excludeExecutionId = null) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const rows = db.prepare(`
      SELECT output_count, duration_ms, status
      FROM executions
      WHERE workflow_id = ? AND started_at >= ? AND status LIKE 'success%'
        AND id != ?
      ORDER BY started_at DESC
    `).all(workflowId, since.toISOString(), excludeExecutionId ?? '');
    if (rows.length === 0) return null;
    const counts = rows.map(r => r.output_count).filter(c => c != null);
    const durations = rows.map(r => r.duration_ms).filter(d => d != null);
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      sampleSize: rows.length,
      avgOutputCount: counts.length ? avg(counts) : null,
      avgDurationMs: durations.length ? avg(durations) : null,
    };
  },

  // All executions since a given ISO date, oldest first — used for reports.
  findSince(workflowId, sinceIso) {
    return db.prepare(`
      SELECT * FROM executions
      WHERE workflow_id = ? AND started_at >= ?
      ORDER BY started_at ASC
    `).all(workflowId, sinceIso);
  },

  // Get the most recent execution
  getLatest(workflowId) {
    return db.prepare(`
      SELECT * FROM executions WHERE workflow_id = ? ORDER BY started_at DESC LIMIT 1
    `).get(workflowId);
  },

  // Count recent failures
  countRecentFailures(workflowId, limit = 5) {
    return db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT status FROM executions
        WHERE workflow_id = ?
        ORDER BY started_at DESC LIMIT ?
      ) WHERE status = 'failed'
    `).get(workflowId, limit);
  },
};
