/**
 * Auth Controller — Register, Login, GetMe
 *
 * Phase 0 spec (phases-1.md):
 *  POST /api/auth/register
 *  POST /api/auth/login
 *  GET  /api/auth/me   ← added here
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = '7d';

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * POST /api/auth/register
 * Body: { name, email, password, personaType? }
 */
async function register(req, res) {
  const { name, email, password, personaType } = req.body;
  // Note: presence validation is handled upstream by validateRequest middleware.
  // Controller only handles business logic.

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
      data: null,
    });
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: password, // Hashed by pre-save hook in User.model.js
    ...(personaType && { personaType }),
  });

  const token = signToken(user._id);

  return res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: { user, token },
  });
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    // Deliberately vague — don't reveal whether email exists
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
      data: null,
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
      data: null,
    });
  }

  const token = signToken(user._id);

  return res.json({
    success: true,
    message: 'Login successful.',
    data: { user, token },
  });
}

/**
 * GET /api/auth/me
 * Protected — requires authMiddleware (which attaches req.user).
 * Returns the current authenticated user's profile without passwordHash.
 * Used by the frontend to rehydrate auth state on page refresh.
 */
async function getMe(req, res) {
  // req.user is already populated and passwordHash is stripped by User.toJSON()
  return res.json({
    success: true,
    message: 'Authenticated user retrieved.',
    data: { user: req.user },
  });
}

module.exports = { register, login, getMe };
