// ============================================================
// engine/layer1-heartbeat.js
// Layer 1: Execution Check — Did the workflow run on time?
// ============================================================

import { ExecutionModel } from '../models/execution.js';

/**
 * @param {object} workflow - workflow row from DB
 * @returns {{ passed: boolean, reason: string|null }}
 */
export function checkHeartbeat(workflow) {
  const latest = ExecutionModel.getLatest(workflow.id);

  // Never ran
  if (!latest) {
    return {
      passed: false,
      reason: `Workflow has never executed. Expected frequency: every ${workflow.expected_frequency_minutes} minutes.`,
    };
  }

  const lastRunMs = new Date(latest.started_at).getTime();
  const nowMs = Date.now();
  const diffMinutes = (nowMs - lastRunMs) / 60000;
  const allowedMinutes = workflow.expected_frequency_minutes * 1.5; // 50% grace window

  if (diffMinutes > allowedMinutes) {
    const hoursAgo = Math.round(diffMinutes / 60 * 10) / 10;
    return {
      passed: false,
      reason: `No execution for ${hoursAgo}h. Expected every ${workflow.expected_frequency_minutes} minutes.`,
    };
  }

  return { passed: true, reason: null };
}
