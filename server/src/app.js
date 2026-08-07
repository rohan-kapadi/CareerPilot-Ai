// Must be first — loads and validates .env before any module reads process.env.
const config = require('./config/env');

const path = require('path');
require('express-async-errors');
const dns = require('dns');

// Set DNS servers to Google Public DNS to resolve SRV query ECONNREFUSED issues on local networks/Windows
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { connectDB } = require('./config/db');

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
const suggestionRoutes = require('./routes/suggestionRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes');

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
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  config.clientUrl,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
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
// REST-plural alias documented in phases-1.md §1 — same router, both paths work.
app.use('/api/resumes', resumeRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/user', userRoutes);
app.use('/api/jds', jdRoutes);
app.use('/api/matching', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/roadmap', roadmapRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// --------------- Global Error Handler ---------------
// Must be registered LAST — handles errors from all routes and middleware.
app.use(errorHandler);

// --------------- Database & Start ---------------
connectDB().then(() => {
  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port} [${config.env}]`);
  });
});

module.exports = app;
