// ============================================================
// seedData.js — Demo data that mirrors the frontend mock scenarios
// Shared by the CLI script (server/db/seed.js) and the
// POST /api/demo/seed route so "Load demo data" works from the UI.
// ============================================================

import { db } from './database.js';
import { randomUUID } from 'crypto';

function ago(minutes) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}

export function seedDemoData() {

// ── Clear existing demo data ──────────────────────────────────
db.exec(`
  DELETE FROM incidents;
  DELETE FROM checks;
  DELETE FROM executions;
  DELETE FROM workflows;
`);

// ── IDs ───────────────────────────────────────────────────────
const WF = {
  lead:    'wf-001',
  sales:   'wf-002',
  stripe:  'wf-003',
  onboard: 'wf-004',
  catalog: 'wf-005',
  backup:  'wf-006',
};

const INC = {
  sales:   'inc-001',
  stripe:  'inc-002',
  onboard: 'inc-003',
  catalog: 'inc-004',
};

// ── Workflows ─────────────────────────────────────────────────
const insertWf = db.prepare(`
  INSERT INTO workflows (id, name, platform, description, expected_frequency_minutes, status, created_at, updated_at)
  VALUES (@id, @name, @platform, @description, @freq, @status, @created_at, @updated_at)
`);

const workflows = [
  { id: WF.lead,    name: 'Lead → CRM → Email',           platform: 'n8n',        status: 'healthy',  freq: 60,      desc: 'Qualifies incoming leads via AI, creates CRM records, sends follow-up emails.',               daysAgo: 30 },
  { id: WF.sales,   name: 'Daily Sales Report',            platform: 'Make',       status: 'warning',  freq: 1440,    desc: 'Compiles daily sales data and sends summary report to the team Slack channel.',               daysAgo: 14 },
  { id: WF.stripe,  name: 'Stripe → Invoice Sync',         platform: 'Zapier',     status: 'failed',   freq: 30,      desc: 'Syncs new Stripe payments to accounting software and generates invoices.',                     daysAgo: 60 },
  { id: WF.onboard, name: 'Customer Onboarding Sequence',  platform: 'n8n',        status: 'inactive', freq: 60,      desc: 'Sends onboarding emails and sets up accounts for new customers.',                             daysAgo: 7  },
  { id: WF.catalog, name: 'Product Catalog Sync',          platform: 'Make',       status: 'warning',  freq: 360,     desc: 'Syncs product listings from supplier API to e-commerce store.',                               daysAgo: 45 },
  { id: WF.backup,  name: 'Weekly Backup Export',          platform: 'Custom API', status: 'healthy',  freq: 10080,   desc: 'Exports database backup to cloud storage every Monday.',                                       daysAgo: 90 },
];

for (const w of workflows) {
  insertWf.run({
    id: w.id, name: w.name, platform: w.platform,
    description: w.desc, freq: w.freq, status: w.status,
    created_at: ago(60 * 24 * w.daysAgo),
    updated_at: ago(60 * 24 * w.daysAgo),
  });
}

// ── Checks ───────────────────────────────────────────────────
const insertCheck = db.prepare(`
  INSERT INTO checks (id, workflow_id, type, label, configuration, enabled, last_result, last_reason)
  VALUES (@id, @wid, @type, @label, @config, @enabled, @result, @reason)
`);

const checksData = [
  // wf-001 HEALTHY — all pass
  { id: 'c-001-1', wid: WF.lead, type: 'execution_check', label: 'Ran within expected window',    config: '{}',                              result: 'passed', reason: null },
  { id: 'c-001-2', wid: WF.lead, type: 'output_check',    label: 'CRM record created',             config: '{"field":"crm_id"}',             result: 'passed', reason: null },
  { id: 'c-001-3', wid: WF.lead, type: 'output_check',    label: 'Lead qualification status set',  config: '{"field":"qualification"}',      result: 'passed', reason: null },
  { id: 'c-001-4', wid: WF.lead, type: 'output_check',    label: 'Follow-up email created',        config: '{"field":"email_sent"}',         result: 'passed', reason: null },
  { id: 'c-001-5', wid: WF.lead, type: 'data_validation', label: 'customer_id field present',      config: '{"type":"required_field","field":"customer_id"}', result: 'passed', reason: null },
  { id: 'c-001-6', wid: WF.lead, type: 'anomaly',         label: 'Volume within normal range',     config: '{"threshold":0.5}',              result: 'passed', reason: null },

  // wf-002 WARNING silent failure
  { id: 'c-002-1', wid: WF.sales, type: 'execution_check', label: 'Ran within expected window',   config: '{}',                              result: 'passed', reason: null },
  { id: 'c-002-2', wid: WF.sales, type: 'output_check',    label: 'Report file generated',        config: '{"field":"report_file"}',        result: 'failed', reason: 'No report file found in output' },
  { id: 'c-002-3', wid: WF.sales, type: 'output_check',    label: 'Slack message sent',           config: '{"field":"slack_message"}',      result: 'failed', reason: 'Slack step returned empty response' },
  { id: 'c-002-4', wid: WF.sales, type: 'data_validation', label: 'report_date field present',   config: '{"type":"required_field","field":"report_date"}', result: 'passed', reason: null },
  { id: 'c-002-5', wid: WF.sales, type: 'anomaly',         label: 'Volume within normal range',   config: '{"threshold":0.5}',              result: 'passed', reason: null },

  // wf-003 FAILED technical
  { id: 'c-003-1', wid: WF.stripe, type: 'execution_check', label: 'Ran within expected window',  config: '{}',                              result: 'failed', reason: 'Last execution failed with API error' },
  { id: 'c-003-2', wid: WF.stripe, type: 'output_check',    label: 'Invoice created in accounting',config: '{"field":"invoice_id"}',        result: 'failed', reason: 'Execution did not complete' },
  { id: 'c-003-3', wid: WF.stripe, type: 'data_validation', label: 'invoice_id field present',   config: '{"type":"required_field","field":"invoice_id"}', result: 'failed', reason: 'No output received' },
  { id: 'c-003-4', wid: WF.stripe, type: 'anomaly',         label: 'Error rate within normal range',config: '{"threshold":0.5}',            result: 'failed', reason: 'Error rate spiked to 100% in last 3 runs' },

  // wf-004 INACTIVE
  { id: 'c-004-1', wid: WF.onboard, type: 'execution_check', label: 'Ran within expected window', config: '{}',                             result: 'failed', reason: 'No execution for 5 hours (expected: every 1 hour)' },
  { id: 'c-004-2', wid: WF.onboard, type: 'output_check',    label: 'Welcome email sent',         config: '{"field":"welcome_email"}',      result: null,     reason: 'Cannot verify — workflow not running' },
  { id: 'c-004-3', wid: WF.onboard, type: 'output_check',    label: 'Account setup completed',    config: '{"field":"account_setup"}',      result: null,     reason: 'Cannot verify — workflow not running' },

  // wf-005 WARNING anomaly
  { id: 'c-005-1', wid: WF.catalog, type: 'execution_check', label: 'Ran within expected window', config: '{}',                             result: 'passed', reason: null },
  { id: 'c-005-2', wid: WF.catalog, type: 'output_check',    label: 'Products synced to store',   config: '{"field":"product_count"}',     result: 'passed', reason: null },
  { id: 'c-005-3', wid: WF.catalog, type: 'data_validation', label: 'product_id field present',  config: '{"type":"required_field","field":"product_id"}', result: 'passed', reason: null },
  { id: 'c-005-4', wid: WF.catalog, type: 'anomaly',         label: 'Output volume within normal range', config: '{"threshold":0.5}',       result: 'failed', reason: 'Synced 18 products vs. baseline avg of 102 products (−82%)' },

  // wf-006 HEALTHY backup
  { id: 'c-006-1', wid: WF.backup, type: 'execution_check', label: 'Ran within expected window',  config: '{}',                             result: 'passed', reason: null },
  { id: 'c-006-2', wid: WF.backup, type: 'output_check',    label: 'Backup file uploaded',        config: '{"field":"backup_file"}',        result: 'passed', reason: null },
  { id: 'c-006-3', wid: WF.backup, type: 'data_validation', label: 'backup_size > 0',            config: '{"type":"minimum_count","min":1}', result: 'passed', reason: null },
];

for (const c of checksData) {
  insertCheck.run({ id: c.id, wid: c.wid, type: c.type, label: c.label, config: c.config, enabled: 1, result: c.result ?? null, reason: c.reason ?? null });
}

// ── Executions ────────────────────────────────────────────────
const insertExec = db.prepare(`
  INSERT INTO executions (id, workflow_id, status, started_at, completed_at, duration_ms, output_count, note)
  VALUES (@id, @wid, @status, @started_at, @completed_at, @duration_ms, @output_count, @note)
`);

const execsData = [
  // wf-001 healthy runs
  { id: randomUUID(), wid: WF.lead, status: 'success', min: 45,  dur: 1240, count: 3, note: null },
  { id: randomUUID(), wid: WF.lead, status: 'success', min: 105, dur: 1180, count: 4, note: null },
  { id: randomUUID(), wid: WF.lead, status: 'success', min: 165, dur: 1310, count: 2, note: null },
  { id: randomUUID(), wid: WF.lead, status: 'success', min: 225, dur: 1200, count: 5, note: null },
  { id: randomUUID(), wid: WF.lead, status: 'success', min: 285, dur: 1150, count: 3, note: null },
  // wf-002 silent failure
  { id: randomUUID(), wid: WF.sales, status: 'success_silent_fail', min: 27*60,  dur: 3200, count: 0, note: 'Execution completed but output was empty' },
  { id: randomUUID(), wid: WF.sales, status: 'success',             min: 51*60,  dur: 2900, count: 1, note: null },
  { id: randomUUID(), wid: WF.sales, status: 'success',             min: 75*60,  dur: 3100, count: 1, note: null },
  { id: randomUUID(), wid: WF.sales, status: 'success',             min: 99*60,  dur: 2800, count: 1, note: null },
  // wf-003 technical failures
  { id: randomUUID(), wid: WF.stripe, status: 'failed', min: 95,  dur: 420,  count: 0, note: '401 Unauthorized from Stripe API' },
  { id: randomUUID(), wid: WF.stripe, status: 'failed', min: 125, dur: 380,  count: 0, note: '401 Unauthorized from Stripe API' },
  { id: randomUUID(), wid: WF.stripe, status: 'failed', min: 155, dur: 410,  count: 0, note: '401 Unauthorized from Stripe API' },
  { id: randomUUID(), wid: WF.stripe, status: 'success', min: 6*60, dur: 1900, count: 2, note: null },
  // wf-004 inactive — last runs were fine
  { id: randomUUID(), wid: WF.onboard, status: 'success', min: 5*60, dur: 2100, count: 2, note: null },
  { id: randomUUID(), wid: WF.onboard, status: 'success', min: 6*60, dur: 2050, count: 1, note: null },
  { id: randomUUID(), wid: WF.onboard, status: 'success', min: 7*60, dur: 2200, count: 3, note: null },
  // wf-005 anomaly
  { id: randomUUID(), wid: WF.catalog, status: 'success_anomaly', min: 2*60,  dur: 4800, count: 18,  note: 'Volume anomaly: only 18 of avg 102' },
  { id: randomUUID(), wid: WF.catalog, status: 'success',         min: 8*60,  dur: 4600, count: 105, note: null },
  { id: randomUUID(), wid: WF.catalog, status: 'success',         min: 14*60, dur: 4700, count: 98,  note: null },
  { id: randomUUID(), wid: WF.catalog, status: 'success',         min: 20*60, dur: 4550, count: 110, note: null },
  // wf-006 backup
  { id: randomUUID(), wid: WF.backup, status: 'success', min: 60*24*2, dur: 18400, count: 1, note: null },
  { id: randomUUID(), wid: WF.backup, status: 'success', min: 60*24*9, dur: 17900, count: 1, note: null },
  { id: randomUUID(), wid: WF.backup, status: 'success', min: 60*24*16, dur: 18100, count: 1, note: null },
];

for (const e of execsData) {
  const started = ago(e.min);
  const completed = new Date(new Date(started).getTime() + e.dur).toISOString();
  insertExec.run({ id: e.id, wid: e.wid, status: e.status, started_at: started, completed_at: completed, duration_ms: e.dur, output_count: e.count, note: e.note });
}

// ── Incidents ────────────────────────────────────────────────
const insertInc = db.prepare(`
  INSERT INTO incidents (id, workflow_id, type, severity, message, evidence, ai_explanation, suggested_action, status, detected_at)
  VALUES (@id, @wid, @type, @severity, @message, @evidence, @ai, @action, 'active', @detected_at)
`);

const incsData = [
  {
    id: INC.sales, wid: WF.sales, type: 'missing_output', severity: 'high',
    message: 'Workflow completed successfully, but the expected report and Slack message were not created.',
    evidence: JSON.stringify(['Last successful output: 51 hours ago', 'Expected interval: 24 hours', 'Execution status: SUCCESS (technical)', 'Report file: NOT FOUND', 'Slack message: EMPTY RESPONSE']),
    ai: 'The workflow appears to run without errors, but the output step is silently failing. This is likely caused by a misconfigured Slack integration or an empty data source feeding the report. Check the Slack webhook token and verify that the upstream data query returns records.',
    action: 'Check the Slack webhook configuration and verify the upstream data query returns non-empty results.',
    detected_at: ago(27 * 60),
  },
  {
    id: INC.stripe, wid: WF.stripe, type: 'technical_failure', severity: 'critical',
    message: 'Workflow is failing with a technical error. Invoices are not being created.',
    evidence: JSON.stringify(['Last 3 runs: all failed', 'Error: Stripe API 401 Unauthorized', 'Invoice creation: BLOCKED', 'Financial impact: potential lost records']),
    ai: 'The 401 Unauthorized error from Stripe indicates the API key has expired or been revoked. This is a credentials issue, not a logic problem. Rotate the Stripe API key and update the environment variable in your automation platform.',
    action: 'Rotate the Stripe API key in your Zapier connection settings and re-test the workflow.',
    detected_at: ago(95),
  },
  {
    id: INC.onboard, wid: WF.onboard, type: 'inactivity', severity: 'high',
    message: 'Workflow has not run for 5 hours. Expected frequency: every 1 hour.',
    evidence: JSON.stringify(['Last execution: 5 hours ago', 'Expected: every 60 minutes', 'Missed executions: ~5', 'New customers may not be receiving onboarding emails']),
    ai: 'The workflow stopped executing without generating an error. This could be caused by a trigger misconfiguration, a disabled workflow, or a webhook that stopped receiving events.',
    action: 'Check n8n workflow status and verify the trigger source (webhook or schedule) is still active.',
    detected_at: ago(4 * 60),
  },
  {
    id: INC.catalog, wid: WF.catalog, type: 'anomaly', severity: 'medium',
    message: 'Output volume dropped 82% compared to normal baseline. Only 18 products synced vs. avg 102.',
    evidence: JSON.stringify(["Today's sync: 18 products", '30-day average: 102 products', 'Drop: 82%', 'Execution status: SUCCESS', 'No validation errors detected']),
    ai: 'The workflow ran successfully and passed all validation checks, but produced significantly fewer records than normal. This pattern suggests an upstream issue — the supplier API may be returning incomplete data, or a filter condition has changed.',
    action: 'Check the supplier API response directly and verify no filter criteria changed in the workflow.',
    detected_at: ago(2 * 60),
  },
];

for (const i of incsData) {
  insertInc.run({ id: i.id, wid: i.wid, type: i.type, severity: i.severity, message: i.message, evidence: i.evidence, ai: i.ai, action: i.action, detected_at: i.detected_at });
}

console.log(`[Seed] ✅ Seeded ${workflows.length} workflows, ${checksData.length} checks, ${execsData.length} executions, ${incsData.length} incidents`);

  return {
    workflows: workflows.length,
    checks: checksData.length,
    executions: execsData.length,
    incidents: incsData.length,
  };
}
