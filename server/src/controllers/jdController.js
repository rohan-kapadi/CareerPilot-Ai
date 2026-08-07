/**
 * JD Controller — Phase 1
 *
 * POST /api/jds      — persist a job description + run AdaptIQ skill-gap analysis
 * GET  /api/jds      — list current user's saved JDs
 * GET  /api/jds/:id  — fetch one JD by id
 */
const JobDescription = require('../models/JobDescription');
const Resume = require('../models/Resume.model');
const { analyzeJD } = require('../agents/jdAgent');

/**
 * POST /api/jds
 * Body: { rawText, title?, company?, resumeId? }
 */
async function createJD(req, res) {
  const { rawText, title = '', company = '', resumeId } = req.body;

  if (!rawText || !rawText.trim()) {
    return res.status(400).json({
      success: false,
      message: 'rawText (job description text) is required.',
      data: null,
    });
  }

  // Optionally load resume sections for skill-gap context
  let resumeSections = null;
  if (resumeId) {
    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found.',
        data: null,
      });
    }
    resumeSections = resume.sections;
  }

  // Run AdaptIQ-style skill-gap analysis via jdAgent → python-service /skill-gap
  let extracted;
  try {
    extracted = await analyzeJD(rawText, resumeSections);
  } catch (err) {
    console.error('JD skill-gap analysis error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze job description. Please try again.',
      data: null,
    });
  }

  const jd = await JobDescription.create({
    userId: req.userId,
    rawText: rawText.trim(),
    title: title.trim(),
    company: company.trim(),
    extracted,
    analyzedWithResumeId: resumeId || null,
  });

  return res.status(201).json({
    success: true,
    message: 'Job description saved and analyzed.',
    data: { jd },
  });
}

/**
 * GET /api/jds
 * List all JDs for current user (newest first).
 */
async function listJDs(req, res) {
  const jds = await JobDescription.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .select('-rawText') // omit large text from list view
    .lean();

  return res.json({
    success: true,
    message: 'Job descriptions retrieved.',
    data: { jds },
  });
}

/**
 * GET /api/jds/:id
 * Fetch a single JD (full, including rawText).
 */
async function getJD(req, res) {
  const jd = await JobDescription.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!jd) {
    return res.status(404).json({
      success: false,
      message: 'Job description not found.',
      data: null,
    });
  }

  return res.json({
    success: true,
    message: 'Job description retrieved.',
    data: { jd },
  });
}

module.exports = { createJD, listJDs, getJD };
