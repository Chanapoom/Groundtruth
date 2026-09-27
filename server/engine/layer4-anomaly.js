// ============================================================
// engine/layer4-anomaly.js
// Layer 4: Anomaly Detection — Statistical comparison vs baseline
// Uses rule-based detection (no AI). AI is only for explanation.
// ============================================================

import { ExecutionModel } from '../models/execution.js';

/**
 * Compare current execution output_count against 30-day average.
 * Flags anomaly if deviation exceeds the configured threshold.
 *
 * @param {object} workflow
 * @param {object} check - check row with configuration: { threshold: 0.5 }
 * @returns {{ passed: boolean, reason: string|null, evidence: object|null }}
 */
export function checkAnomaly(workflow, check) {
  const latest = ExecutionModel.getLatest(workflow.id);
  if (!latest) {
    return { passed: null, reason: 'No executions yet.', evidence: null };
  }
  if (latest.status === 'failed') {
    return { passed: null, reason: 'Last execution failed — anomaly check skipped.', evidence: null };
  }

  const baseline = ExecutionModel.getBaseline(workflow.id, 30, latest.id);
  if (!baseline || baseline.sampleSize < 3) {
    // Not enough history to detect anomalies
    return { passed: null, reason: 'Not enough execution history for anomaly detection (need ≥3 runs).', evidence: null };
  }

  const config = typeof check.configuration === 'string'
    ? JSON.parse(check.configuration)
    : check.configuration;

  const threshold = config.threshold ?? 0.5; // Default: flag if 50% deviation

  // ── Volume anomaly ───────────────────────────────────────────
  if (baseline.avgOutputCount !== null && baseline.avgOutputCount > 0) {
    const currentCount = latest.output_count ?? 0;
    const deviation = Math.abs(currentCount - baseline.avgOutputCount) / baseline.avgOutputCount;

    if (deviation > threshold) {
      const dropPct = Math.round((1 - currentCount / baseline.avgOutputCount) * 100);
      const direction = currentCount < baseline.avgOutputCount ? 'dropped' : 'spiked';
      return {
        passed: false,
        reason: `Output volume ${direction} ${Math.abs(dropPct)}% vs. 30-day average. Current: ${currentCount}, Baseline avg: ${Math.round(baseline.avgOutputCount)}.`,
        evidence: {
          current: currentCount,
          baseline: Math.round(baseline.avgOutputCount),
          deviationPct: Math.round(deviation * 100),
          sampleSize: baseline.sampleSize,
        },
      };
    }
  }

  // ── Duration anomaly (execution taking much longer than usual) ─
  if (baseline.avgDurationMs !== null && latest.duration_ms && baseline.avgDurationMs > 0) {
    const durationDeviation = (latest.duration_ms - baseline.avgDurationMs) / baseline.avgDurationMs;
    if (durationDeviation > threshold * 2) { // Higher threshold for duration
      return {
        passed: false,
        reason: `Execution duration increased significantly: ${Math.round(latest.duration_ms / 1000)}s vs. avg ${Math.round(baseline.avgDurationMs / 1000)}s.`,
        evidence: {
          currentDurationMs: latest.duration_ms,
          baselineAvgMs: Math.round(baseline.avgDurationMs),
          sampleSize: baseline.sampleSize,
        },
      };
    }
  }

  return { passed: true, reason: null, evidence: null };
}
