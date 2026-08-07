/**
 * Request body validation middleware factory.
 *
 * Usage:
 *   validateRequest({ name: true, email: isEmail, password: true })
 *
 * Each key in `schema` maps to a req.body field.
 * - If the value is `true`  → field is required (non-empty presence check).
 * - If the value is a Function → called as validator(value, fieldName) and
 *   should return `null` on success or an error string on failure.
 *
 * On failure, responds 400 with `{ success: false, message, data: null }`.
 */
const validateRequest = (schema) => (req, res, next) => {
  const errors = [];

  for (const [field, rule] of Object.entries(schema)) {
    const value = req.body[field];

    // Presence check
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push(`${field} is required.`);
      continue;
    }

    // Custom validator
    if (typeof rule === 'function') {
      const error = rule(value, field);
      if (error) errors.push(error);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(' '),
      data: null,
    });
  }

  next();
};

/* ── Built-in validators ──────────────────────────────────────────────────── */

/** Validates email format. */
validateRequest.isEmail = (value, field) => {
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
  return ok ? null : `${field} must be a valid email address.`;
};

/**
 * Validates minimum string length.
 * @param {number} min
 * @returns {Function}
 */
validateRequest.minLength = (min) => (value, field) => {
  return String(value).trim().length >= min
    ? null
    : `${field} must be at least ${min} characters long.`;
};

/**
 * Validates that value is one of the allowed enum values (case-sensitive).
 * @param {string[]} allowed
 * @returns {Function}
 */
validateRequest.oneOf = (allowed) => (value, field) => {
  return allowed.includes(value)
    ? null
    : `${field} must be one of: ${allowed.join(', ')}.`;
};

module.exports = validateRequest;
