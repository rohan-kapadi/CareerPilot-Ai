const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');
const validateRequest = require('../middleware/validateRequest');
const { register, login, getMe } = require('../controllers/auth.controller');

/**
 * POST /api/auth/register
 * Validates required fields, then delegates to register controller.
 * personaType is optional — validated only when present.
 */
router.post(
  '/register',
  validateRequest({
    name: validateRequest.minLength(1),
    email: validateRequest.isEmail,
    password: validateRequest.minLength(3),
  }),
  register
);

/**
 * POST /api/auth/login
 * Validates required fields, then delegates to login controller.
 */
router.post(
  '/login',
  validateRequest({
    email: validateRequest.isEmail,
    password: true,
  }),
  login
);

/**
 * GET /api/auth/me
 * Protected — returns the currently authenticated user.
 * Frontend uses this to rehydrate auth state on page load.
 */
router.get('/me', authMiddleware, getMe);

module.exports = router;
