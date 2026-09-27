// ============================================================
// database.js — SQLite connection + schema creation
// Uses better-sqlite3 (synchronous, simple, no server needed)
// ============================================================

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(__dirname, 'autohealth.db');

// Ensure directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ───────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id                        TEXT PRIMARY KEY,
    name                      TEXT NOT NULL,
    platform                  TEXT NOT NULL DEFAULT 'Other',
    description               TEXT,
    expected_frequency_minutes INTEGER NOT NULL DEFAULT 60,
    status                    TEXT NOT NULL DEFAULT 'healthy'
                              CHECK(status IN ('healthy','warning','failed','inactive')),
    created_at                TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS executions (
    id              TEXT PRIMARY KEY,
    workflow_id     TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status          TEXT NOT NULL
                    CHECK(status IN ('success','failed','success_silent_fail','success_anomaly')),
    started_at      TEXT NOT NULL,
    completed_at    TEXT,
    duration_ms     INTEGER,
    input_summary   TEXT,
    output_summary  TEXT,
    output_count    INTEGER DEFAULT 0,
    note            TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checks (
    id            TEXT PRIMARY KEY,
    workflow_id   TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    type          TEXT NOT NULL
                  CHECK(type IN ('execution_check','output_check','data_validation','anomaly')),
    label         TEXT NOT NULL,
    configuration TEXT NOT NULL DEFAULT '{}',
    enabled       INTEGER NOT NULL DEFAULT 1,
    last_result   TEXT CHECK(last_result IN ('passed','failed',NULL)),
    last_reason   TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id               TEXT PRIMARY KEY,
    workflow_id      TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    type             TEXT NOT NULL
                     CHECK(type IN ('inactivity','missing_output','validation_failure','anomaly','technical_failure','unmonitored')),
    severity         TEXT NOT NULL
                     CHECK(severity IN ('low','medium','high','critical')),
    message          TEXT NOT NULL,
    evidence         TEXT NOT NULL DEFAULT '[]',
    ai_explanation   TEXT,
    suggested_action TEXT,
    status           TEXT NOT NULL DEFAULT 'active'
                     CHECK(status IN ('active','resolved')),
    detected_at      TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_executions_workflow ON executions(workflow_id, started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_checks_workflow ON checks(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_incidents_workflow ON incidents(workflow_id, status);
  CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, detected_at DESC);
`);

// Migrate older databases whose `incidents.type` CHECK constraint predates
// the 'unmonitored' incident type (SQLite can't ALTER a CHECK constraint,
// so the table is rebuilt in place, preserving existing rows).
const incidentsTableSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'incidents'`).get()?.sql;
if (incidentsTableSql && !incidentsTableSql.includes('unmonitored')) {
  db.exec(`
    ALTER TABLE incidents RENAME TO incidents_old;

    CREATE TABLE incidents (
      id               TEXT PRIMARY KEY,
      workflow_id      TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      type             TEXT NOT NULL
                       CHECK(type IN ('inactivity','missing_output','validation_failure','anomaly','technical_failure','unmonitored')),
      severity         TEXT NOT NULL
                       CHECK(severity IN ('low','medium','high','critical')),
      message          TEXT NOT NULL,
      evidence         TEXT NOT NULL DEFAULT '[]',
      ai_explanation   TEXT,
      suggested_action TEXT,
      status           TEXT NOT NULL DEFAULT 'active'
                       CHECK(status IN ('active','resolved')),
      detected_at      TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at      TEXT
    );

    INSERT INTO incidents SELECT * FROM incidents_old;
    DROP TABLE incidents_old;

    CREATE INDEX IF NOT EXISTS idx_incidents_workflow ON incidents(workflow_id, status);
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, detected_at DESC);
  `);
  console.log('[DB] Migrated incidents table to allow the "unmonitored" incident type.');
}

console.log(`[DB] Connected: ${DB_PATH}`);
