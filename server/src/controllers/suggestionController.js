/**
 * Suggestion Controller — Phase 6 (Human Approval Workflow)
 *
 * THE write-gate for AI-proposed resume changes, system-wide.
 *
 * INVARIANT:
 *   approveSuggestion() and bulkApprove() are the ONLY functions in the codebase
 *   that apply an AI-generated diff to Resume.sections. Agents propose; the user
 *   disposes. Nothing here runs without an explicit request from the resume owner.
 *
 * Routes:
 *   GET  /api/suggestions               — listSuggestions (review queue)
 *   POST /api/suggestions/generate      — generateSuggestions (runs recommendationAgent)
 *   POST /api/suggestions/:id/approve   — approveSuggestion (applies the diff)
 *   POST /api/suggestions/:id/reject    — rejectSuggestion
 *   POST /api/suggestions/bulk-approve  — bulkApprove (requires confirmed count)
 */
const Suggestion = require('../models/Suggestion');
const Resume = require('../models/Resume.model');
const Memory = require('../models/Memory');
const recommendationAgent = require('../agents/recommendationAgent');
const versionService = require('../services/versionService');
const {
  ALLOWED_ROOTS,
  applyDiff,
  getByPath,
  deepEqual,
  summarizeDiff,
  computeDiff,
} = require('../utils/sectionDiff');

/**
 * Has the resume changed underneath this suggestion since it was proposed?
 * Guards the user's own newer edits from being silently overwritten.
 */
function isStale(sections, diff) {
  if (!diff?.path) return false;
  // 'add' merges into whatever is there now, so it can never go stale.
  if (diff.op === 'add') return false;
  const current = getByPath(sections, diff.path);
  return !deepEqual(current, diff.before);
}

/**
 * Apply one suggestion's diff to its resume.
 *
 * The single mutation point for AI-generated content. approveSuggestion() and
 * acceptSectionDraft() both funnel through here so there is exactly one place
 * that writes AI output into Resume.sections.
 *
 * Note it writes only the diffed path onto a clone of the *full* sections
 * document — it never replaces sections wholesale.
 *
 * @returns {Promise<{ok: boolean, code?: number, message?: string, data?: object,
 *                    resume?: object, changes?: Array, noop?: boolean}>}
 */
async function applySuggestionToResume(suggestion, userId, { force = false } = {}) {
  const resume = await Resume.findOne({ _id: suggestion.resumeId, userId }).lean();
  if (!resume) {
    return {
      ok: false,
      code: 404,
      message: 'The resume this suggestion targets no longer exists.',
    };
  }

  if (!force && isStale(resume.sections, suggestion.diff)) {
    return {
      ok: false,
      code: 409,
      message:
        'Your resume changed after this suggestion was written. Review it and re-approve to apply anyway.',
      data: {
        stale: true,
        path: suggestion.diff.path,
        expected: suggestion.diff.before,
        current: getByPath(resume.sections, suggestion.diff.path) ?? null,
      },
    };
  }

  const nextSections = applyDiff(resume.sections, suggestion.diff);
  const changes = computeDiff(resume.sections, nextSections);

  if (!changes.length) {
    return { ok: true, resume: null, changes: [], noop: true };
  }

  const updated = await Resume.findOneAndUpdate(
    { _id: suggestion.resumeId, userId },
    { $set: { sections: nextSections } },
    { new: true, runValidators: true }
  );

  // Phase 7: every approved change appends a ResumeVersion. This coupling is
  // the reason version history can claim to be a complete audit trail.
  const version = await versionService.recordChange(
    suggestion.resumeId,
    userId,
    resume.sections,
    nextSections,
    { suggestionId: suggestion._id }
  );

  return { ok: true, resume: updated, changes, noop: false, version };
}

/**
 * GET /api/suggestions
 * Query: status (default 'pending'), suggestionType, resumeId
 */
async function listSuggestions(req, res) {
  const { status = 'pending', suggestionType, resumeId } = req.query;
  const filter = { userId: req.userId };

  if (status !== 'all') filter.status = status;
  if (suggestionType) filter.suggestionType = suggestionType;
  if (resumeId) filter.resumeId = resumeId;

  const suggestions = await Suggestion.find(filter)
    .sort({ createdAt: -1 })
    .populate('resumeId', 'originalFileName')
    .populate('sourceRef.jdId', 'title company')
    .lean();

  return res.json({
    success: true,
    message: 'Suggestions retrieved.',
    data: {
      suggestions,
      pendingCount: suggestions.filter((s) => s.status === 'pending').length,
    },
  });
}

/**
 * POST /api/suggestions/generate
 * Body: { resumeId, jdId?, matchId?, limit? }
 *
 * Runs the Recommendation Agent. Everything it returns is 'pending' —
 * generating suggestions never changes the resume.
 */
async function generateSuggestions(req, res) {
  const { resumeId, jdId = null, matchId = null, limit } = req.body;

  if (!resumeId) {
    return res.status(400).json({ success: false, message: 'resumeId is required.', data: null });
  }

  const resume = await Resume.findOne({ _id: resumeId, userId: req.userId }).lean();
  if (!resume) {
    return res.status(404).json({ success: false, message: 'Resume not found.', data: null });
  }

  let created;
  try {
    created = await recommendationAgent.generateOptimizerSuggestions({
      userId: req.userId,
      resumeId,
      jdId,
      matchId,
      limit: Math.min(Math.max(Number(limit) || 6, 1), 10),
    });
  } catch (err) {
    console.error('generateSuggestions error:', err.message);
    return res.status(502).json({ success: false, message: err.message, data: null });
  }

  return res.status(201).json({
    success: true,
    message: created.length
      ? `${created.length} suggestion${created.length !== 1 ? 's' : ''} ready for your review.`
      : 'No new suggestions — your resume already covers this job well.',
    data: { suggestions: created, count: created.length },
  });
}

/**
 * POST /api/suggestions/:id/approve
 * Query: ?force=true to apply over a stale diff
 *
 * This is the ONLY place an AI-generated diff reaches Resume.sections.
 */
async function approveSuggestion(req, res) {
  const suggestion = await Suggestion.findOne({ _id: req.params.id, userId: req.userId });

  if (!suggestion) {
    return res.status(404).json({ success: false, message: 'Suggestion not found.', data: null });
  }
  if (suggestion.status !== 'pending') {
    return res.status(409).json({
      success: false,
      message: `This suggestion was already ${suggestion.status}.`,
      data: null,
    });
  }

  // Roadmap items carry no resume diff — approving one just starts the roadmap.
  if (suggestion.suggestionType === 'roadmap') {
    suggestion.status = 'accepted';
    suggestion.decidedAt = new Date();
    await suggestion.save();

    await Memory.create({
      userId: req.userId,
      type: 'long_term',
      category: 'goals',
      content: `User is actively learning ${suggestion.roadmap?.skill || 'a new skill'} via a learning roadmap.`,
      rationale: 'Created automatically when the user started a new learning roadmap.',
      confidence: 1.0,
      status: 'accepted',
      sourceRef: {
        resumeId: suggestion.resumeId || null,
      }
    });

    return res.json({
      success: true,
      message: `Roadmap for ${suggestion.roadmap?.skill || 'this skill'} started.`,
      data: { suggestion, resume: null },
    });
  }

  const result = await applySuggestionToResume(suggestion, req.userId, {
    force: req.query.force === 'true',
  });

  if (!result.ok) {
    return res.status(result.code).json({
      success: false,
      message: result.message,
      data: result.data ?? null,
    });
  }

  suggestion.status = 'accepted';
  suggestion.decidedAt = new Date();
  suggestion.appliedVersionNumber = result.version?.versionNumber ?? null;
  await suggestion.save();

  if (result.noop) {
    return res.json({
      success: true,
      message: 'Nothing to change — your resume already matches this suggestion.',
      data: { suggestion, resume: null },
    });
  }

  return res.json({
    success: true,
    message: `Applied: ${summarizeDiff(result.changes)}`,
    data: {
      suggestion,
      resume: result.resume,
      changes: result.changes,
      version: result.version,
    },
  });
}

/**
 * POST /api/suggestions/:id/reject
 * Body: { reason? }
 */
async function rejectSuggestion(req, res) {
  const suggestion = await Suggestion.findOne({ _id: req.params.id, userId: req.userId });

  if (!suggestion) {
    return res.status(404).json({ success: false, message: 'Suggestion not found.', data: null });
  }
  if (suggestion.status !== 'pending') {
    return res.status(409).json({
      success: false,
      message: `This suggestion was already ${suggestion.status}.`,
      data: null,
    });
  }

  suggestion.status = 'rejected';
  suggestion.decidedAt = new Date();
  await suggestion.save();

  return res.json({
    success: true,
    message: 'Suggestion rejected. Your resume is unchanged.',
    data: { suggestion },
  });
}

/**
 * POST /api/suggestions/bulk-approve
 * Body: { ids: [String], confirmedCount: Number }
 *
 * PROJECT.md §10: bulk approval requires an explicit second confirmation
 * carrying the exact number of changes about to be applied. A mismatch between
 * `confirmedCount` and `ids.length` means the user confirmed a different set
 * than the one being submitted, so we refuse rather than guess.
 */
async function bulkApprove(req, res) {
  const { ids, confirmedCount } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'ids must be a non-empty array of suggestion IDs.',
      data: null,
    });
  }

  if (Number(confirmedCount) !== ids.length) {
    return res.status(400).json({
      success: false,
      message: `Confirmation mismatch: you confirmed ${confirmedCount} change(s) but submitted ${ids.length}. Nothing was applied.`,
      data: null,
    });
  }

  const suggestions = await Suggestion.find({
    _id: { $in: ids },
    userId: req.userId,
    status: 'pending',
  }).sort({ createdAt: 1 });

  if (!suggestions.length) {
    return res.status(404).json({
      success: false,
      message: 'None of those suggestions are still pending.',
      data: null,
    });
  }

  const applied = [];
  const skipped = [];

  // Roadmap approvals touch no resume — settle them first.
  const roadmapItems = suggestions.filter((s) => s.suggestionType === 'roadmap');
  for (const item of roadmapItems) {
    item.status = 'accepted';
    item.decidedAt = new Date();
    await item.save();
    applied.push({ id: item._id, title: item.title });
  }

  // Group the rest by resume so each resume is written exactly once.
  const editItems = suggestions.filter((s) => s.suggestionType !== 'roadmap');
  const byResume = new Map();
  editItems.forEach((item) => {
    const key = String(item.resumeId);
    if (!byResume.has(key)) byResume.set(key, []);
    byResume.get(key).push(item);
  });

  for (const [resumeId, items] of byResume.entries()) {
    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId }).lean();
    if (!resume) {
      items.forEach((item) =>
        skipped.push({ id: item._id, title: item.title, reason: 'Resume no longer exists' })
      );
      continue;
    }

    // Accumulate every diff in memory, then write once.
    let workingSections = resume.sections;
    const accepted = [];

    for (const item of items) {
      if (isStale(workingSections, item.diff)) {
        skipped.push({
          id: item._id,
          title: item.title,
          reason: 'Resume changed after this suggestion was written',
        });
        continue;
      }
      workingSections = applyDiff(workingSections, item.diff);
      accepted.push(item);
    }

    if (!accepted.length) continue;

    const changes = computeDiff(resume.sections, workingSections);

    await Resume.findOneAndUpdate(
      { _id: resumeId, userId: req.userId },
      { $set: { sections: workingSections } },
      { new: true, runValidators: true }
    );

    // Phase 7: the whole batch becomes one version — it was one user decision.
    const version = await versionService.recordChange(
      resumeId,
      req.userId,
      resume.sections,
      workingSections,
      {
        diffSummary: `Bulk approval of ${accepted.length} suggestion${
          accepted.length !== 1 ? 's' : ''
        } — ${summarizeDiff(changes)}`,
      }
    );

    for (const item of accepted) {
      item.status = 'accepted';
      item.decidedAt = new Date();
      item.appliedVersionNumber = version?.versionNumber ?? null;
      await item.save();
      applied.push({ id: item._id, title: item.title });
    }
  }

  return res.json({
    success: true,
    message: `${applied.length} suggestion${applied.length !== 1 ? 's' : ''} applied${
      skipped.length ? `, ${skipped.length} skipped` : ''
    }.`,
    data: { appliedCount: applied.length, applied, skippedCount: skipped.length, skipped },
  });
}

/**
 * POST /api/suggestions/from-draft
 * Body: { resumeId, draft, section?, conversationId?, autoApprove? }
 *
 * Phase 6 refactor of Phase 2's Resume Builder (phases-1.md §6 handoff:
 * "the earlier direct-write behavior from Phase 2's Resume Builder is now
 * routed through this same Suggestion model").
 *
 * `draft` is a partial sections object, e.g. { summary: "..." }.
 * Each top-level key becomes its own Suggestion so it is individually
 * auditable and individually reversible.
 *
 * autoApprove defaults to true because the builder's inline accept/reject chip
 * IS the human approval gate for that draft (PROJECT.md §10, "Resume text edit
 * → diff card, accept/reject per suggestion"). Passing autoApprove: false
 * instead parks the draft in the review queue.
 *
 * This replaces the old client-side updateSections() call, which set the whole
 * `sections` object to just the drafted section and discarded the rest.
 */
async function acceptSectionDraft(req, res) {
  const { resumeId, draft, section, conversationId = null, autoApprove = true } = req.body;

  if (!resumeId || !draft || typeof draft !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'resumeId and a draft object are required.',
      data: null,
    });
  }

  const resume = await Resume.findOne({ _id: resumeId, userId: req.userId }).lean();
  if (!resume) {
    return res.status(404).json({ success: false, message: 'Resume not found.', data: null });
  }

  const created = [];
  const applied = [];
  let latestResume = null;

  for (const [key, value] of Object.entries(draft)) {
    if (!ALLOWED_ROOTS.has(key)) continue;

    const before = getByPath(resume.sections, key);
    if (deepEqual(before, value)) continue;

    /**
     * Deterministic trace, not an evaluatorAgent call. The draft's provenance is
     * known exactly — it was composed from the user's own builder answers and
     * displayed inline before acceptance — so a generated trace would be less
     * truthful than this one, and would add an LLM round-trip to every accept.
     */
    const explanationTrace = {
      reasoning: [
        {
          factor: 'Drafted from your builder answers',
          weight: 1,
          score: 0.9,
          evidence: `Composed by the Resume Builder for the "${section || key}" section from what you typed in this conversation.`,
        },
      ],
      confidence: 0.9,
      alternatives: ['Keep refining this section in the builder to regenerate the draft.'],
      sources: [`conversation.${conversationId || 'builder'}`, `resume.sections.${key}`],
      criticReviewed: false,
      criticFlagsCount: 0,
    };

    const suggestion = await Suggestion.create({
      userId: req.userId,
      resumeId,
      suggestionType: 'edit',
      title: `Builder draft: ${section || key}`.slice(0, 160),
      diff: { path: key, op: 'replace', before: before ?? null, after: value },
      explanationTrace,
      sourceRef: { conversationId },
      status: 'pending', // ← INVARIANT: created pending, even when auto-approved below
    });
    created.push(suggestion);

    if (autoApprove !== false) {
      const result = await applySuggestionToResume(suggestion, req.userId, { force: true });
      if (result.ok) {
        suggestion.status = 'accepted';
        suggestion.decidedAt = new Date();
        await suggestion.save();
        applied.push(suggestion);
        if (result.resume) latestResume = result.resume;
      }
    }
  }

  if (!created.length) {
    return res.json({
      success: true,
      message: 'That section already matches your resume — nothing to save.',
      data: { suggestions: [], appliedCount: 0, resume: null },
    });
  }

  return res.status(201).json({
    success: true,
    message:
      autoApprove !== false
        ? `${section || 'Section'} saved to your resume.`
        : `${created.length} draft change${created.length !== 1 ? 's' : ''} sent to your review queue.`,
    data: {
      suggestions: created,
      appliedCount: applied.length,
      resume: latestResume,
    },
  });
}

module.exports = {
  listSuggestions,
  generateSuggestions,
  approveSuggestion,
  rejectSuggestion,
  bulkApprove,
  acceptSectionDraft,
};
