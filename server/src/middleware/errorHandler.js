/**
 * Global error-handling middleware.
 * Must be registered LAST in app.js (after all routes).
 * Handles both explicit errors (thrown via next(err)) and
 * errors thrown inside async handlers (via express-async-errors).
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Server Error:', err);

  // Mongoose validation errors → 400
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', '),
      data: null,
    });
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `An account with this ${field} already exists.`,
      data: null,
    });
  }

  // JWT errors (if not already caught in authMiddleware)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      data: null,
    });
  }

  // Default
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null,
  });
};

module.exports = errorHandler;
