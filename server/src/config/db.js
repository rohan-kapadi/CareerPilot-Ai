/**
 * Database Connection — Phase 0 file, finalized in Phase 8
 *
 * Mongoose connection to MongoDB (local or Atlas), extracted out of app.js so
 * the seed script and any future worker can reuse the same connection logic.
 */
const mongoose = require('mongoose');
const config = require('./env');

/**
 * Connect to MongoDB.
 * @param {object} [options]
 * @param {boolean} [options.exitOnError=true] - process.exit(1) on failure.
 *   Scripts that want to handle the error themselves pass false.
 */
async function connectDB({ exitOnError = true } = {}) {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');
    return mongoose.connection;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (exitOnError) process.exit(1);
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
