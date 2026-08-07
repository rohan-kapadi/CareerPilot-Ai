/**
 * Environment Configuration — Phase 0 file, finalized in Phase 8
 *
 * Single place where environment variables are loaded and validated.
 * Requiring this module has the side effect of loading server/.env, so it must
 * be the FIRST require in app.js — other modules read process.env at load time.
 *
 * Fail-fast philosophy: a missing JWT_SECRET or MONGO_URI is a configuration
 * bug that should stop the process now, not surface as a confusing 500 later.
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production';

/** Vars the server cannot run correctly without. */
const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];

/** Vars a feature needs — missing ones degrade that feature, not the server. */
const FEATURE_VARS = [
  { key: 'MISTRAL_API_KEY', feature: 'AI agents (chat, suggestions, roadmaps, explanations)' },
  { key: 'PYTHON_SERVICE_URL', feature: 'resume parsing, ATS scoring, course recommendations' },
];

function validate() {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(`❌ Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('   Copy server/.env.example to server/.env and fill these in.');
    process.exit(1);
  }

  // A default secret in production means every token is forgeable.
  if (isProduction && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters in production.');
    process.exit(1);
  }

  FEATURE_VARS.forEach(({ key, feature }) => {
    if (!process.env[key]) {
      console.warn(`⚠️  ${key} is not set — ${feature} will not work.`);
    }
  });
}

validate();

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  port: Number(process.env.PORT) || 5000,

  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  clientUrl: process.env.CLIENT_URL || '',
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
  mistralApiKey: process.env.MISTRAL_API_KEY || '',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

module.exports = config;
