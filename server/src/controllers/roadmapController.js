/**
 * Roadmap Controller — Phase 6
 *
 * Turns a skill gap identified in Phase 1's matching flow into a
 * Suggestion-linked Learning Roadmap (PROJECT.md §6.7, problem #20).
 *
 * "skillGapId" in the route is the identity of the gap. In our document model a
 * gap has no collection of its own — it is a skill string produced by
 * JobDescription.extracted.skillsToImprove. So the param accepts either:
 *   - a JobDescription ObjectId → every gap on that JD
 *   - a URL-encoded skill name  → that single gap, JD-independent
 *
 * Routes:
 *   GET  /api/roadmap/:skillGapId           — getRoadmap (fetch existing)
 *   POST /api/roadmap/:skillGapId/generate  — generateRoadmap (propose new, pending)
 */
const mongoose = require('mongoose');
const Suggestion = require('../models/Suggestion');
const JobDescription = require('../models/JobDescription');
const recommendationAgent = require('../agents/recommendationAgent');

/**
 * Resolve the :skillGapId param into a query target.
 */
function parseSkillGapId(raw) {
  if (mongoose.isValidObjectId(raw)) return { jdId: raw, skill: null };
  return { jdId: null, skill: decodeURIComponent(raw) };
}

/**
 * GET /api/roadmap/:skillGapId
 * Query: ?skill= to narrow a JD-scoped roadmap to one gap
 */
async function getRoadmap(req, res) {
  const { jdId, skill } = parseSkillGapId(req.params.skillGapId);
  const filter = { userId: req.userId, suggestionType: 'roadmap' };

  if (jdId) filter['sourceRef.jdId'] = jdId;

  const targetSkill = req.query.skill || skill;
  if (targetSkill) filter['roadmap.skill'] = targetSkill;

  const roadmaps = await Suggestion.find(filter)
    .sort({ createdAt: -1 })
    .populate('sourceRef.jdId', 'title company')
    .lean();

  return res.json({
    success: true,
    message: 'Roadmap retrieved.',
    data: {
      roadmaps,
      skillGapId: req.params.skillGapId,
      pendingCount: roadmaps.filter((r) => r.status === 'pending').length,
    },
  });
}

/**
 * POST /api/roadmap/:skillGapId/generate
 * Body: { skills?: [String], resumeId? }
 *
 * Everything created here is status 'pending' — the user starts a roadmap by
 * approving it through the normal suggestion approval flow.
 */
async function generateRoadmap(req, res) {
  const { jdId, skill } = parseSkillGapId(req.params.skillGapId);
  const { skills: bodySkills, resumeId = null } = req.body;

  let targetSkills = Array.isArray(bodySkills) ? bodySkills : [];

  if (!targetSkills.length && skill) {
    targetSkills = [skill];
  }

  if (!targetSkills.length && jdId) {
    const jd = await JobDescription.findOne({ _id: jdId, userId: req.userId }).lean();
    if (!jd) {
      return res.status(404).json({ success: false, message: 'Job description not found.', data: null });
    }
    targetSkills = jd.extracted?.skillsToImprove || [];
  }

  if (!targetSkills.length) {
    return res.status(400).json({
      success: false,
      message: 'No skill gaps to build a roadmap from. Match a resume to a job description first.',
      data: null,
    });
  }

  let created;
  try {
    created = await recommendationAgent.generateRoadmap({
      userId: req.userId,
      skills: targetSkills,
      jdId,
      resumeId,
    });
  } catch (err) {
    console.error('generateRoadmap error:', err.message);
    return res.status(502).json({ success: false, message: err.message, data: null });
  }

  return res.status(201).json({
    success: true,
    message: created.length
      ? `Roadmap proposed for ${created.length} skill gap${created.length !== 1 ? 's' : ''}. Approve to start.`
      : 'Could not build a roadmap for those skills.',
    data: { roadmaps: created, count: created.length },
  });
}

module.exports = { getRoadmap, generateRoadmap };
