// ============================================================
// engine/layer2-output.js
// Layer 2: Output Check — Did the workflow produce expected output?
// ============================================================

import { ExecutionModel } from '../models/execution.js';

/**
 * Checks if the most recent execution produced meaningful output.
 * Silent failure = execution reported success but output_count = 0.
 *
 * @param {object} workflow
 * @param {object} check - check row with configuration JSON
 * @returns {{ passed: boolean, reason: string|null }}
 */
export function checkOutput(workflow, check) {
  const latest = ExecutionModel.getLatest(workflow.id);
  if (!latest) {
    return { passed: null, reason: 'No executions yet — cannot verify output.' };
  }

  // If the execution itself failed technically, skip output check
  if (latest.status === 'failed') {
    return { passed: null, reason: 'Last execution failed technically — output check skipped.' };
  }

  const config = typeof check.configuration === 'string'
    ? JSON.parse(check.configuration)
    : check.configuration;

  const minCount = config.min ?? 1;

  if (latest.output_count === 0 || latest.output_count < minCount) {
    return {
      passed: false,
      reason: `Expected at least ${minCount} output item(s), but got ${latest.output_count}. Execution status was SUCCESS — this is a silent failure.`,
    };
  }

  return { passed: true, reason: null };
}
