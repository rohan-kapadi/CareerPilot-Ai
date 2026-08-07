/**
 * Version Service — Phase 7
 *
 * The only writer of ResumeVersion documents. Callers:
 *   - resume.controller.uploadResume      → baseline snapshot (v1)
 *   - suggestionController (approve/bulk)  → snapshot after each applied change
 *   - resume.controller.restoreVersion     → append-only rollback
 *
 * Deliberately AI-free and side-effect-light: a versioning failure must never
 * lose a resume edit that already succeeded, so recordChange() swallows and
 * logs its errors rather than propagating them.
 */
const ResumeVersion = require('../models/ResumeVersion');
const { computeDiff, summarizeDiff } = require('../utils/sectionDiff');

/** Next version number for a resume (1-based). */
async function nextVersionNumber(resumeId) {
  const latest = await ResumeVersion.findOne({ resumeId })
    .sort({ versionNumber: -1 })
    .select('versionNumber')
    .lean();
  return (latest?.versionNumber ?? 0) + 1;
}

/**
 * Append a version. Retries on the unique-index collision that two concurrent
 * approvals on the same resume would produce.
 */
async function createVersion(
  resumeId,
  userId,
  sections,
  { diffSummary = '', suggestionId = null, origin = 'suggestion' } = {}
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const versionNumber = await nextVersionNumber(resumeId);
    try {
      return await ResumeVersion.create({
        resumeId,
        userId,
        versionNumber,
        sections,
        diffSummary,
        suggestionId,
        origin,
      });
    } catch (err) {
      // 11000 = duplicate key: another write claimed this number first, recompute
      if (err.code === 11000 && attempt < 2) continue;
      throw err;
    }
  }
  return null;
}

/**
 * Create the v1 baseline if this resume has no history yet.
 * Lets resumes that predate Phase 7 still get a coherent timeline the first
 * time they're changed.
 */
async function ensureBaseline(resumeId, userId, sections) {
  const existing = await ResumeVersion.countDocuments({ resumeId });
  if (existing > 0) return null;
  return createVersion(resumeId, userId, sections, {
    diffSummary: 'Initial version',
    origin: 'baseline',
  });
}

/**
 * Record a change: guarantees a baseline exists, then snapshots the new state
 * with an auto-generated diff summary.
 *
 * @returns {Promise<object|null>} the new version, or null if versioning failed
 */
async function recordChange(
  resumeId,
  userId,
  beforeSections,
  afterSections,
  { suggestionId = null, origin = 'suggestion', diffSummary } = {}
) {
  try {
    await ensureBaseline(resumeId, userId, beforeSections);

    const summary =
      diffSummary ?? summarizeDiff(computeDiff(beforeSections, afterSections));

    return await createVersion(resumeId, userId, afterSections, {
      diffSummary: summary,
      suggestionId,
      origin,
    });
  } catch (err) {
    // The resume write already succeeded — never fail the user's edit over history.
    console.error('versionService.recordChange error:', err.message);
    return null;
  }
}

module.exports = { nextVersionNumber, createVersion, ensureBaseline, recordChange };
