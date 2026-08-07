/**
 * ResumeVersion Model — Phase 7
 *
 * Append-only snapshot of Resume.sections (PROJECT.md §6.9).
 *
 * COUPLING (keep intact — phases-1.md §7 handoff):
 *   Versions are created only by versionService, which is called from
 *   suggestionController when a Suggestion is approved (plus the baseline
 *   snapshot taken at upload, and restores). Never create these by hand.
 *
 * Version 1 is always the baseline — the resume as it first existed. Every
 * approved change appends the *resulting* state as the next version, so
 * restoring version N means "put my resume back the way it was at N".
 */
const mongoose = require('mongoose');

const resumeVersionSchema = new mongoose.Schema(
  {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** 1-based, monotonically increasing per resume. */
    versionNumber: {
      type: Number,
      required: true,
    },
    /**
     * Full snapshot of Resume.sections at this point in time.
     * Mixed rather than the Resume sub-schema so an old snapshot stays readable
     * even if the resume schema gains fields later.
     */
    sections: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    /** Human-readable summary of what changed vs. the previous version. */
    diffSummary: {
      type: String,
      default: '',
    },
    /** Which Suggestion produced this version — null for baseline and restores. */
    suggestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Suggestion',
      default: null,
    },
    /**
     * How this version came to exist:
     * - baseline:   first snapshot, taken at upload
     * - suggestion: an approved Suggestion was applied
     * - restore:    the user rolled back to an earlier version
     */
    origin: {
      type: String,
      enum: ['baseline', 'suggestion', 'restore'],
      default: 'suggestion',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// One row per (resume, version) — also makes the timeline query an index scan
resumeVersionSchema.index({ resumeId: 1, versionNumber: -1 }, { unique: true });

module.exports = mongoose.model('ResumeVersion', resumeVersionSchema);
