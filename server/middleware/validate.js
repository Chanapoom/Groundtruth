// ============================================================
// middleware/validate.js — Input validation middleware
// Lightweight, no external dependencies
// ============================================================

/**
 * Create a validation middleware from an array of validators.
 * Returns 400 with errors if any validation fails.
 */
export function validate(validators) {
  return (req, res, next) => {
    const errors = [];
    for (const v of validators) {
      const error = v(req.body);
      if (error) errors.push(error);
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
  };
}

// ── Validators ────────────────────────────────────────────────

export const required = (field) => (body) => {
  if (body[field] === undefined || body[field] === null || body[field] === '') {
    return `Field "${field}" is required`;
  }
};

export const isString = (field) => (body) => {
  if (body[field] !== undefined && typeof body[field] !== 'string') {
    return `Field "${field}" must be a string`;
  }
};

export const isNumber = (field) => (body) => {
  if (body[field] !== undefined && typeof body[field] !== 'number') {
    return `Field "${field}" must be a number`;
  }
};

export const isIn = (field, values) => (body) => {
  if (body[field] !== undefined && !values.includes(body[field])) {
    return `Field "${field}" must be one of: ${values.join(', ')}`;
  }
};

export const maxLength = (field, max) => (body) => {
  if (body[field] && typeof body[field] === 'string' && body[field].length > max) {
    return `Field "${field}" must be at most ${max} characters`;
  }
};
