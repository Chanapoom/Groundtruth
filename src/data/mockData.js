// ============================================================
// MOCK DATA — Demo Mode
// All data is in-memory. Simulates real monitoring scenarios.
// Replace with API calls when backend is ready.
// ============================================================

export const PLATFORMS = ["n8n", "Make", "Zapier", "Custom API", "Other"];

export const STATUS = {
  HEALTHY: "healthy",
  WARNING: "warning",
  FAILED: "failed",
  INACTIVE: "inactive",
};

export const SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export const INCIDENT_TYPE = {
  INACTIVITY: "inactivity",
  MISSING_OUTPUT: "missing_output",
  VALIDATION_FAILURE: "validation_failure",
  ANOMALY: "anomaly",
  TECHNICAL_FAILURE: "technical_failure",
};

// ── Helper: relative timestamps ──────────────────────────────
const ago = (minutes) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
};

// ── WORKFLOWS ────────────────────────────────────────────────
export const workflows = [
  // ① HEALTHY — everything works perfectly
  {
    id: "wf-001",
    name: "Lead → CRM → Email",
    platform: "n8n",
    description:
      "Qualifies incoming leads via AI, creates CRM records, sends follow-up emails.",
    expectedFrequencyMinutes: 60,
    status: STATUS.HEALTHY,
    checks: [
      { id: "c-001-1", type: "execution_check", label: "Ran within expected window", passed: true },
      { id: "c-001-2", type: "output_check", label: "CRM record created", passed: true },
      { id: "c-001-3", type: "output_check", label: "Lead qualification status set", passed: true },
      { id: "c-001-4", type: "output_check", label: "Follow-up email created", passed: true },
      { id: "c-001-5", type: "data_validation", label: "customer_id field present", passed: true },
      { id: "c-001-6", type: "anomaly", label: "Volume within normal range", passed: true },
    ],
    lastRunAt: ago(45),
    lastSuccessAt: ago(45),
    activeIncidents: [],
    createdAt: ago(60 * 24 * 30),
  },

  // ② WARNING — Silent Failure: workflow ran SUCCESS but email not created
  {
    id: "wf-002",
    name: "Daily Sales Report",
    platform: "Make",
    description:
      "Compiles daily sales data and sends summary report to the team Slack channel.",
    expectedFrequencyMinutes: 60 * 24, // every 24h
    status: STATUS.WARNING,
    checks: [
      { id: "c-002-1", type: "execution_check", label: "Ran within expected window", passed: true },
      { id: "c-002-2", type: "output_check", label: "Report file generated", passed: false, failReason: "No report file found in output" },
      { id: "c-002-3", type: "output_check", label: "Slack message sent", passed: false, failReason: "Slack step returned empty response" },
      { id: "c-002-4", type: "data_validation", label: "report_date field present", passed: true },
      { id: "c-002-5", type: "anomaly", label: "Volume within normal range", passed: true },
    ],
    lastRunAt: ago(27 * 60),
    lastSuccessAt: ago(51 * 60),
    activeIncidents: ["inc-001"],
    createdAt: ago(60 * 24 * 14),
  },

  // ③ FAILED — Technical failure
  {
    id: "wf-003",
    name: "Stripe → Invoice Sync",
    platform: "Zapier",
    description:
      "Syncs new Stripe payments to accounting software and generates invoices.",
    expectedFrequencyMinutes: 30,
    status: STATUS.FAILED,
    checks: [
      { id: "c-003-1", type: "execution_check", label: "Ran within expected window", passed: false, failReason: "Last execution failed with API error" },
      { id: "c-003-2", type: "output_check", label: "Invoice created in accounting", passed: false, failReason: "Execution did not complete" },
      { id: "c-003-3", type: "data_validation", label: "invoice_id field present", passed: false, failReason: "No output received" },
      { id: "c-003-4", type: "anomaly", label: "Error rate within normal range", passed: false, failReason: "Error rate spiked to 100% in last 3 runs" },
    ],
    lastRunAt: ago(95),
    lastSuccessAt: ago(6 * 60),
    activeIncidents: ["inc-002"],
    createdAt: ago(60 * 24 * 60),
  },

  // ④ INACTIVE — Stopped running entirely
  {
    id: "wf-004",
    name: "Customer Onboarding Sequence",
    platform: "n8n",
    description:
      "Sends onboarding emails and sets up accounts for new customers.",
    expectedFrequencyMinutes: 60,
    status: STATUS.INACTIVE,
    checks: [
      { id: "c-004-1", type: "execution_check", label: "Ran within expected window", passed: false, failReason: "No execution for 5 hours (expected: every 1 hour)" },
      { id: "c-004-2", type: "output_check", label: "Welcome email sent", passed: null, failReason: "Cannot verify — workflow not running" },
      { id: "c-004-3", type: "output_check", label: "Account setup completed", passed: null, failReason: "Cannot verify — workflow not running" },
    ],
    lastRunAt: ago(5 * 60),
    lastSuccessAt: ago(5 * 60),
    activeIncidents: ["inc-003"],
    createdAt: ago(60 * 24 * 7),
  },

  // ⑤ WARNING — Volume Anomaly (output dropped 82%)
  {
    id: "wf-005",
    name: "Product Catalog Sync",
    platform: "Make",
    description:
      "Syncs product listings from supplier API to e-commerce store.",
    expectedFrequencyMinutes: 60 * 6, // every 6h
    status: STATUS.WARNING,
    checks: [
      { id: "c-005-1", type: "execution_check", label: "Ran within expected window", passed: true },
      { id: "c-005-2", type: "output_check", label: "Products synced to store", passed: true },
      { id: "c-005-3", type: "data_validation", label: "product_id field present", passed: true },
      { id: "c-005-4", type: "anomaly", label: "Output volume within normal range", passed: false, failReason: "Synced 18 products vs. baseline avg of 102 products (−82%)" },
    ],
    lastRunAt: ago(2 * 60),
    lastSuccessAt: ago(2 * 60),
    activeIncidents: ["inc-004"],
    createdAt: ago(60 * 24 * 45),
  },

  // ⑥ HEALTHY — simple healthy workflow
  {
    id: "wf-006",
    name: "Weekly Backup Export",
    platform: "Custom API",
    description: "Exports database backup to cloud storage every Monday.",
    expectedFrequencyMinutes: 60 * 24 * 7,
    status: STATUS.HEALTHY,
    checks: [
      { id: "c-006-1", type: "execution_check", label: "Ran within expected window", passed: true },
      { id: "c-006-2", type: "output_check", label: "Backup file uploaded", passed: true },
      { id: "c-006-3", type: "data_validation", label: "backup_size > 0", passed: true },
    ],
    lastRunAt: ago(60 * 24 * 2),
    lastSuccessAt: ago(60 * 24 * 2),
    activeIncidents: [],
    createdAt: ago(60 * 24 * 90),
  },
];

// ── INCIDENTS ────────────────────────────────────────────────
export const incidents = [
  {
    id: "inc-001",
    workflowId: "wf-002",
    workflowName: "Daily Sales Report",
    type: INCIDENT_TYPE.MISSING_OUTPUT,
    severity: SEVERITY.HIGH,
    status: "active",
    message: "Workflow completed successfully, but the expected report and Slack message were not created.",
    evidence: [
      "Last successful output: 51 hours ago",
      "Expected interval: 24 hours",
      "Execution status: SUCCESS (technical)",
      "Report file: NOT FOUND",
      "Slack message: EMPTY RESPONSE",
    ],
    aiExplanation:
      "The workflow appears to run without errors, but the output step is silently failing. This is likely caused by a misconfigured Slack integration or an empty data source feeding the report. Check the Slack webhook token and verify that the upstream data query returns records.",
    suggestedAction: "Check the Slack webhook configuration and verify the upstream data query returns non-empty results.",
    detectedAt: ago(27 * 60),
    resolvedAt: null,
  },
  {
    id: "inc-002",
    workflowId: "wf-003",
    workflowName: "Stripe → Invoice Sync",
    type: INCIDENT_TYPE.TECHNICAL_FAILURE,
    severity: SEVERITY.CRITICAL,
    status: "active",
    message: "Workflow is failing with a technical error. Invoices are not being created.",
    evidence: [
      "Last 3 runs: all failed",
      "Error: Stripe API 401 Unauthorized",
      "Invoice creation: BLOCKED",
      "Financial impact: potential lost records",
    ],
    aiExplanation:
      "The 401 Unauthorized error from Stripe indicates the API key has expired or been revoked. This is a credentials issue, not a logic problem. Rotate the Stripe API key and update the environment variable in your automation platform.",
    suggestedAction: "Rotate the Stripe API key in your Zapier connection settings and re-test the workflow.",
    detectedAt: ago(95),
    resolvedAt: null,
  },
  {
    id: "inc-003",
    workflowId: "wf-004",
    workflowName: "Customer Onboarding Sequence",
    type: INCIDENT_TYPE.INACTIVITY,
    severity: SEVERITY.HIGH,
    status: "active",
    message: "Workflow has not run for 5 hours. Expected frequency: every 1 hour.",
    evidence: [
      "Last execution: 5 hours ago",
      "Expected: every 60 minutes",
      "Missed executions: ~5",
      "New customers may not be receiving onboarding emails",
    ],
    aiExplanation:
      "The workflow stopped executing without generating an error. This could be caused by a trigger misconfiguration, a disabled workflow, or a webhook that stopped receiving events. Check whether the n8n workflow is still active and verify the trigger source.",
    suggestedAction: "Check n8n workflow status and verify the trigger source (webhook or schedule) is still active.",
    detectedAt: ago(4 * 60),
    resolvedAt: null,
  },
  {
    id: "inc-004",
    workflowId: "wf-005",
    workflowName: "Product Catalog Sync",
    type: INCIDENT_TYPE.ANOMALY,
    severity: SEVERITY.MEDIUM,
    status: "active",
    message: "Output volume dropped 82% compared to normal baseline. Only 18 products synced vs. avg 102.",
    evidence: [
      "Today's sync: 18 products",
      "30-day average: 102 products",
      "Drop: 82%",
      "Execution status: SUCCESS",
      "No validation errors detected",
    ],
    aiExplanation:
      "The workflow ran successfully and passed all validation checks, but produced significantly fewer records than normal. This pattern suggests an upstream issue — the supplier API may be returning incomplete data, or a filter condition has changed. The workflow itself is technically healthy.",
    suggestedAction: "Check the supplier API response directly and verify no filter criteria changed in the workflow.",
    detectedAt: ago(2 * 60),
    resolvedAt: null,
  },
];

// ── EXECUTION HISTORY (per workflow) ─────────────────────────
export const executionHistory = {
  "wf-001": [
    { id: "e1", status: "success", startedAt: ago(45), durationMs: 1240, outputCount: 3 },
    { id: "e2", status: "success", startedAt: ago(105), durationMs: 1180, outputCount: 4 },
    { id: "e3", status: "success", startedAt: ago(165), durationMs: 1310, outputCount: 2 },
    { id: "e4", status: "success", startedAt: ago(225), durationMs: 1200, outputCount: 5 },
    { id: "e5", status: "success", startedAt: ago(285), durationMs: 1150, outputCount: 3 },
  ],
  "wf-002": [
    { id: "e1", status: "success_silent_fail", startedAt: ago(27 * 60), durationMs: 3200, outputCount: 0, note: "Execution completed but output was empty" },
    { id: "e2", status: "success", startedAt: ago(51 * 60), durationMs: 2900, outputCount: 1 },
    { id: "e3", status: "success", startedAt: ago(75 * 60), durationMs: 3100, outputCount: 1 },
    { id: "e4", status: "success", startedAt: ago(99 * 60), durationMs: 2800, outputCount: 1 },
  ],
  "wf-003": [
    { id: "e1", status: "failed", startedAt: ago(95), durationMs: 420, outputCount: 0, note: "401 Unauthorized from Stripe API" },
    { id: "e2", status: "failed", startedAt: ago(125), durationMs: 380, outputCount: 0, note: "401 Unauthorized from Stripe API" },
    { id: "e3", status: "failed", startedAt: ago(155), durationMs: 410, outputCount: 0, note: "401 Unauthorized from Stripe API" },
    { id: "e4", status: "success", startedAt: ago(6 * 60), durationMs: 1900, outputCount: 2 },
  ],
  "wf-004": [
    { id: "e1", status: "success", startedAt: ago(5 * 60), durationMs: 2100, outputCount: 2 },
    { id: "e2", status: "success", startedAt: ago(6 * 60), durationMs: 2050, outputCount: 1 },
    { id: "e3", status: "success", startedAt: ago(7 * 60), durationMs: 2200, outputCount: 3 },
    { id: "e4", status: "success", startedAt: ago(8 * 60), durationMs: 1980, outputCount: 2 },
  ],
  "wf-005": [
    { id: "e1", status: "success_anomaly", startedAt: ago(2 * 60), durationMs: 4800, outputCount: 18, note: "Volume anomaly: only 18 of avg 102" },
    { id: "e2", status: "success", startedAt: ago(8 * 60), durationMs: 4600, outputCount: 105 },
    { id: "e3", status: "success", startedAt: ago(14 * 60), durationMs: 4700, outputCount: 98 },
    { id: "e4", status: "success", startedAt: ago(20 * 60), durationMs: 4550, outputCount: 110 },
  ],
  "wf-006": [
    { id: "e1", status: "success", startedAt: ago(60 * 24 * 2), durationMs: 18400, outputCount: 1 },
    { id: "e2", status: "success", startedAt: ago(60 * 24 * 9), durationMs: 17900, outputCount: 1 },
    { id: "e3", status: "success", startedAt: ago(60 * 24 * 16), durationMs: 18100, outputCount: 1 },
  ],
};

// ── Computed helpers ─────────────────────────────────────────

export function getHealthSummary(wfList) {
  return {
    total: wfList.length,
    healthy: wfList.filter((w) => w.status === STATUS.HEALTHY).length,
    warning: wfList.filter((w) => w.status === STATUS.WARNING).length,
    failed: wfList.filter((w) => w.status === STATUS.FAILED).length,
    inactive: wfList.filter((w) => w.status === STATUS.INACTIVE).length,
  };
}

export function getHealthScore(summary) {
  if (summary.total === 0) return 100;
  const problemWeight = summary.failed * 3 + summary.inactive * 2 + summary.warning * 1;
  const maxProblem = summary.total * 3;
  return Math.max(0, Math.round(100 - (problemWeight / maxProblem) * 100));
}

export function formatRelativeTime(isoString) {
  if (!isoString) return "Never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getFrequencyLabel(minutes) {
  if (minutes < 60) return `Every ${minutes}min`;
  if (minutes === 60) return "Every hour";
  if (minutes < 60 * 24) return `Every ${Math.round(minutes / 60)}h`;
  if (minutes === 60 * 24) return "Daily";
  if (minutes === 60 * 24 * 7) return "Weekly";
  return `Every ${Math.round(minutes / (60 * 24))} days`;
}
