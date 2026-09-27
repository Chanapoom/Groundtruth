// tests/engine/validation.test.js
// Unit tests for Layer 3 — Data Validation

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/models/execution.js', () => ({
  ExecutionModel: {
    getLatest: vi.fn(),
  },
}));

import { checkValidation } from '../../server/engine/layer3-validation.js';
import { ExecutionModel } from '../../server/models/execution.js';

const mockWf = { id: 'wf-val-test', name: 'Validation Test' };

describe('Layer 3 — Data Validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates required_field rule successfully when field exists and is populated', () => {
    ExecutionModel.getLatest.mockReturnValue({
      status: 'success',
      output_summary: JSON.stringify({ customer_id: 'cust-123', email: 'test@example.com' }),
    });
    const check = { configuration: { type: 'required_field', field: 'customer_id' } };
    const result = checkValidation(mockWf, check);
    expect(result.passed).toBe(true);
  });

  it('fails required_field rule when field is missing', () => {
    ExecutionModel.getLatest.mockReturnValue({
      status: 'success',
      output_summary: JSON.stringify({ email: 'test@example.com' }),
    });
    const check = { configuration: { type: 'required_field', field: 'customer_id' } };
    const result = checkValidation(mockWf, check);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('missing');
  });

  it('fails required_field rule when field is empty string', () => {
    ExecutionModel.getLatest.mockReturnValue({
      status: 'success',
      output_summary: JSON.stringify({ customer_id: '' }),
    });
    const check = { configuration: { type: 'required_field', field: 'customer_id' } };
    const result = checkValidation(mockWf, check);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('empty');
  });

  it('validates minimum_count rule', () => {
    ExecutionModel.getLatest.mockReturnValue({ status: 'success', output_count: 3 });
    const check = { configuration: { type: 'minimum_count', min: 5 } };
    const result = checkValidation(mockWf, check);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Expected at least 5 records, got 3');
  });

  it('validates contains_value rule', () => {
    ExecutionModel.getLatest.mockReturnValue({
      status: 'success',
      output_summary: JSON.stringify({ status: 'ACTIVE' }),
    });
    const check = { configuration: { type: 'contains_value', field: 'status', value: 'ACTIVE' } };
    const result = checkValidation(mockWf, check);
    expect(result.passed).toBe(true);
  });
});
