// tests/engine/anomaly.test.js
// Unit tests for Layer 4 — Anomaly Detection

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/models/execution.js', () => ({
  ExecutionModel: {
    getLatest: vi.fn(),
    getBaseline: vi.fn(),
  },
}));

import { checkAnomaly } from '../../server/engine/layer4-anomaly.js';
import { ExecutionModel } from '../../server/models/execution.js';

const mockWf = { id: 'wf-anom-test', name: 'Anomaly Test' };
const mockCheck = { configuration: JSON.stringify({ threshold: 0.5 }) };

describe('Layer 4 — Anomaly Detection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes when output count is close to baseline average', () => {
    ExecutionModel.getLatest.mockReturnValue({ status: 'success', output_count: 100 });
    ExecutionModel.getBaseline.mockReturnValue({ sampleSize: 10, avgOutputCount: 102, avgDurationMs: 1000 });
    const result = checkAnomaly(mockWf, mockCheck);
    expect(result.passed).toBe(true);
  });

  it('detects volume drop anomaly when current output drops significantly below baseline', () => {
    ExecutionModel.getLatest.mockReturnValue({ status: 'success', output_count: 18 });
    ExecutionModel.getBaseline.mockReturnValue({ sampleSize: 10, avgOutputCount: 102, avgDurationMs: 1000 });
    const result = checkAnomaly(mockWf, mockCheck);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('dropped 82%');
    expect(result.evidence).toBeDefined();
    expect(result.evidence.current).toBe(18);
  });

  it('returns null when baseline sample size is less than 3', () => {
    ExecutionModel.getLatest.mockReturnValue({ status: 'success', output_count: 10 });
    ExecutionModel.getBaseline.mockReturnValue({ sampleSize: 2, avgOutputCount: 10, avgDurationMs: 1000 });
    const result = checkAnomaly(mockWf, mockCheck);
    expect(result.passed).toBeNull();
    expect(result.reason).toContain('Not enough execution history');
  });
});
