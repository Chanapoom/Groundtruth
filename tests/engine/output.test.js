// tests/engine/output.test.js
// Unit tests for Layer 2 — Output Check (Silent failure detection)

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/models/execution.js', () => ({
  ExecutionModel: {
    getLatest: vi.fn(),
  },
}));

import { checkOutput } from '../../server/engine/layer2-output.js';
import { ExecutionModel } from '../../server/models/execution.js';

const mockWf = { id: 'wf-output-test', name: 'Output Test Workflow' };
const mockCheck = { configuration: JSON.stringify({ min: 1 }) };

describe('Layer 2 — Output Check', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes when output count meets minimum requirement', () => {
    ExecutionModel.getLatest.mockReturnValue({ status: 'success', output_count: 5 });
    const result = checkOutput(mockWf, mockCheck);
    expect(result.passed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('fails (detects silent failure) when execution reports success but output_count is 0', () => {
    ExecutionModel.getLatest.mockReturnValue({ status: 'success', output_count: 0 });
    const result = checkOutput(mockWf, mockCheck);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('silent failure');
  });

  it('skips output check when execution failed technically', () => {
    ExecutionModel.getLatest.mockReturnValue({ status: 'failed', output_count: 0 });
    const result = checkOutput(mockWf, mockCheck);
    expect(result.passed).toBeNull();
    expect(result.reason).toContain('skipped');
  });

  it('returns null when no executions exist', () => {
    ExecutionModel.getLatest.mockReturnValue(null);
    const result = checkOutput(mockWf, mockCheck);
    expect(result.passed).toBeNull();
  });
});
