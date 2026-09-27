// ============================================================
// engine/layer3-validation.js
// Layer 3: Data Validation — Are required fields and types valid?
// Supports: required_field, not_empty, minimum_count, maximum_count,
//           expected_type, contains_value, value_range
// ============================================================

import { ExecutionModel } from '../models/execution.js';

/**
 * Run a single validation check rule against the latest execution's output_summary.
 *
 * @param {object} workflow
 * @param {object} check - check row
 * @returns {{ passed: boolean, reason: string|null }}
 */
export function checkValidation(workflow, check) {
  const latest = ExecutionModel.getLatest(workflow.id);
  if (!latest) {
    return { passed: null, reason: 'No executions yet.' };
  }
  if (latest.status === 'failed') {
    return { passed: null, reason: 'Last execution failed — validation skipped.' };
  }

  const config = typeof check.configuration === 'string'
    ? JSON.parse(check.configuration)
    : check.configuration;

  let output = null;
  if (latest.output_summary) {
    try {
      output = typeof latest.output_summary === 'string'
        ? JSON.parse(latest.output_summary)
        : latest.output_summary;
    } catch {
      return { passed: false, reason: 'Output summary is not valid JSON.' };
    }
  }

  switch (config.type) {
    case 'required_field': {
      if (!output || !(config.field in output)) {
        return { passed: false, reason: `Required field "${config.field}" is missing from output.` };
      }
      if (output[config.field] === null || output[config.field] === undefined || output[config.field] === '') {
        return { passed: false, reason: `Required field "${config.field}" is empty.` };
      }
      return { passed: true, reason: null };
    }

    case 'not_empty': {
      if (latest.output_count === 0) {
        return { passed: false, reason: 'Output is empty — no records produced.' };
      }
      return { passed: true, reason: null };
    }

    case 'minimum_count': {
      const min = config.min ?? 1;
      if (latest.output_count < min) {
        return { passed: false, reason: `Expected at least ${min} records, got ${latest.output_count}.` };
      }
      return { passed: true, reason: null };
    }

    case 'maximum_count': {
      const max = config.max;
      if (max !== undefined && latest.output_count > max) {
        return { passed: false, reason: `Expected at most ${max} records, got ${latest.output_count}.` };
      }
      return { passed: true, reason: null };
    }

    case 'expected_type': {
      if (!output || !config.field || config.expectedType) {
        const val = output?.[config.field];
        // eslint-disable-next-line valid-typeof
        if (val !== undefined && typeof val !== config.expectedType) {
          return { passed: false, reason: `Field "${config.field}" expected type ${config.expectedType}, got ${typeof val}.` };
        }
      }
      return { passed: true, reason: null };
    }

    case 'contains_value': {
      if (!output || !(config.field in output)) {
        return { passed: false, reason: `Field "${config.field}" not found.` };
      }
      if (output[config.field] !== config.value) {
        return { passed: false, reason: `Field "${config.field}" expected "${config.value}", got "${output[config.field]}".` };
      }
      return { passed: true, reason: null };
    }

    case 'value_range': {
      if (!output || !(config.field in output)) {
        return { passed: false, reason: `Field "${config.field}" not found.` };
      }
      const v = output[config.field];
      if ((config.min !== undefined && v < config.min) || (config.max !== undefined && v > config.max)) {
        return { passed: false, reason: `Field "${config.field}" value ${v} is outside range [${config.min}, ${config.max}].` };
      }
      return { passed: true, reason: null };
    }

    default:
      return { passed: null, reason: `Unknown validation type: ${config.type}` };
  }
}
