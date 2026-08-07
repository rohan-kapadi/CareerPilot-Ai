const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('express-async-errors');
const dns = require('dns');

// Set DNS servers to Google Public DNS to resolve SRV query ECONNREFUSED issues on local networks/Windows
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const jobRoutes = require('./routes/job.routes');
const exportRoutes = require('./routes/export.routes');
const userRoutes = require('./routes/user.routes');
const jdRoutes = require('./routes/jdRoutes');
const matchRoutes = require('./routes/matchRoutes');
const chatRoutes = require('./routes/chatRoutes');
const memoryRoutes = require('./routes/memoryRoutes');
const privacyRoutes = require('./routes/privacyRoutes');

// Phase 3: wire memoryAgent into plannerAgent middleware chain
const plannerAgent = require('./agents/plannerAgent');
const memoryAgent  = require('./agents/memoryAgent');
plannerAgent.middleware.push(async (ctx) => { await memoryAgent.extract(ctx); });

const errorHandler = require('./middleware/errorHandler');

const app = express();

// --------------- Middleware ---------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Parse JSON bodies — required for all API endpoints
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve uploaded / exported files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --------------- Routes ---------------
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/user', userRoutes);
app.use('/api/jds', jdRoutes);
app.use('/api/matching', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/privacy', privacyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// --------------- Global Error Handler ---------------
// Must be registered LAST — handles errors from all routes and middleware.
app.use(errorHandler);

// --------------- Database & Start ---------------
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_resume';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
