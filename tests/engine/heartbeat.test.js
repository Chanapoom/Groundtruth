// tests/engine/heartbeat.test.js
// Unit tests for Layer 1 — Heartbeat / execution check

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the ExecutionModel
vi.mock('../../server/models/execution.js', () => ({
  ExecutionModel: {
    getLatest: vi.fn(),
  },
}));

import { checkHeartbeat } from '../../server/engine/layer1-heartbeat.js';
import { ExecutionModel } from '../../server/models/execution.js';

const makeWorkflow = (freqMinutes = 60) => ({
  id: 'wf-test',
  name: 'Test Workflow',
  expected_frequency_minutes: freqMinutes,
});

describe('Layer 1 — Heartbeat', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes when workflow ran within the expected window', () => {
    const twentyMinsAgo = new Date(Date.now() - 20 * 60000).toISOString();
    ExecutionModel.getLatest.mockReturnValue({ started_at: twentyMinsAgo, status: 'success' });
    const result = checkHeartbeat(makeWorkflow(60));
    expect(result.passed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('fails when workflow never ran', () => {
    ExecutionModel.getLatest.mockReturnValue(null);
    const result = checkHeartbeat(makeWorkflow(60));
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('never executed');
  });

  it('fails when workflow has not run within the grace window', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60000).toISOString();
    ExecutionModel.getLatest.mockReturnValue({ started_at: threeHoursAgo, status: 'success' });
    // Expected: 60 min, grace window: 90 min (1.5x) — 3 hours > 90 min
    const result = checkHeartbeat(makeWorkflow(60));
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('No execution for');
  });

  it('passes within 50% grace window', () => {
    // 60 min * 1.5 = 90 min grace — 80 min should pass
    const eightyMinsAgo = new Date(Date.now() - 80 * 60000).toISOString();
    ExecutionModel.getLatest.mockReturnValue({ started_at: eightyMinsAgo, status: 'success' });
    const result = checkHeartbeat(makeWorkflow(60));
    expect(result.passed).toBe(true);
  });

  it('fails just outside grace window', () => {
    // 60 min * 1.5 = 90 min grace — 95 min should fail
    const ninetyFiveMinsAgo = new Date(Date.now() - 95 * 60000).toISOString();
    ExecutionModel.getLatest.mockReturnValue({ started_at: ninetyFiveMinsAgo, status: 'success' });
    const result = checkHeartbeat(makeWorkflow(60));
    expect(result.passed).toBe(false);
  });
});
