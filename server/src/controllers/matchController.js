/**
 * Match Controller — Phase 1
 *
 * POST /api/matching       — run ATS match between a persisted resume and JD, save result
 * GET  /api/matching/:id   — fetch a persisted match result
 * GET  /api/matching        — list current user's matches
 */
const Resume = require('../models/Resume.model');
const JobDescription = require('../models/JobDescription');
const Match = require('../models/Match');
const { runATSMatch } = require('../agents/atsAgent');
const { evaluate } = require('../agents/evaluatorAgent');
const { review } = require('../agents/criticAgent');

/**
 * POST /api/matching
 * Body: { resumeId, jdId }
 */
async function matchResumeToJD(req, res) {
  const { resumeId, jdId } = req.body;

  if (!resumeId || !jdId) {
    return res.status(400).json({
      success: false,
      message: 'Both resumeId and jdId are required.',
      data: null,
    });
  }

  // Ownership checks
  const [resume, jd] = await Promise.all([
    Resume.findOne({ _id: resumeId, userId: req.userId }),
    JobDescription.findOne({ _id: jdId, userId: req.userId }),
  ]);

  if (!resume) {
    return res.status(404).json({ success: false, message: 'Resume not found.', data: null });
  }
  if (!jd) {
    return res.status(404).json({ success: false, message: 'Job description not found.', data: null });
  }

  // Run ATS analysis via atsAgent → python-service /ats-score
  let matchData;
  try {
    matchData = await runATSMatch(resume.sections, jd.rawText);

    // Phase 4: Route through Evaluator and Critic agents for structured ExplanationTrace
    const evaluatedTrace = await evaluate(matchData, 'match', {
      resumeText: JSON.stringify(resume.sections),
      jdText: jd.rawText,
    });
    const reviewedTrace = await review(evaluatedTrace, {
      resumeText: JSON.stringify(resume.sections),
      jdText: jd.rawText,
    });
    matchData.explanationTrace = reviewedTrace;
  } catch (err) {
    console.error('ATS match error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'ATS matching failed. Please try again.',
      data: null,
    });
  }

  // Persist the match (upsert if same resume+JD pair matched again)
  const match = await Match.findOneAndUpdate(
    { resumeId, jdId, userId: req.userId },
    {
      resumeId,
      jdId,
      userId: req.userId,
      overallScore:      matchData.overallScore,
      categoryBreakdown: matchData.categoryBreakdown,
      explanationTrace:  matchData.explanationTrace,
      quickWins:         matchData.quickWins,
      atsVerdict:        matchData.atsVerdict,
    },
    { new: true, upsert: true, runValidators: true }
  );

  // Also update the Resume doc's cached score fields for quick display
  await Resume.findByIdAndUpdate(resumeId, {
    atsScore:          matchData.overallScore,
    matchedSkills:     matchData.categoryBreakdown?.keyword_match?.matched ?? [],
    missingSkills:     matchData.categoryBreakdown?.keyword_match?.missing ?? [],
    lastJobDescription: jd.rawText,
  });

  return res.status(201).json({
    success: true,
    message: 'Resume matched to job description.',
    data: { match },
  });
}

/**
 * GET /api/matching/:id
 */
async function getMatch(req, res) {
  const match = await Match.findOne({
    _id: req.params.id,
    userId: req.userId,
  })
    .populate('resumeId', 'originalFileName sections.personalInfo.name atsScore')
    .populate('jdId', 'title company extracted.skillsToImprove');

  if (!match) {
    return res.status(404).json({
      success: false,
      message: 'Match not found.',
      data: null,
    });
  }

  return res.json({
    success: true,
    message: 'Match retrieved.',
    data: { match },
  });
}

/**
 * GET /api/matching
 * List all matches for current user (newest first).
 */
async function listMatches(req, res) {
  const matches = await Match.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .populate('resumeId', 'originalFileName')
    .populate('jdId', 'title company')
    .select('-explanationTrace -categoryBreakdown') // slim list view
    .lean();

  return res.json({
    success: true,
    message: 'Matches retrieved.',
    data: { matches },
  });
}

module.exports = { matchResumeToJD, getMatch, listMatches };
