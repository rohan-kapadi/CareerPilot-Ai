/**
 * Suggestion Model — Phase 6 (Human Approval Workflow)
 *
 * The single write-gate for every AI-proposed change to a resume.
 *
 * INVARIANT (mirrors the Memory invariant from Phase 3):
 *   recommendationAgent.js and every other agent may ONLY create documents with
 *   status: 'pending'. Only suggestionController.approveSuggestion() /
 *   bulkApprove() may transition a Suggestion to 'accepted' AND apply its diff
 *   to Resume.sections. No other controller mutates Resume.sections from AI output.
 *
 * Phase 7 Handoff:
 *   Approving a Suggestion also creates a ResumeVersion snapshot — that coupling
 *   lives in suggestionController, never here.
 */
const mongoose = require('mongoose');

/**
 * One factor in the explanation trace.
 * Shape intentionally mirrors Match.explanationTrace (Phase 1/4) so
 * <ReasoningTrace> renders both without branching.
 */
const reasoningFactorSchema = new mongoose.Schema(
  {
    factor: { type: String, required: true },
    weight: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    evidence: { type: String, default: '' },
  },
  { _id: false }
);

/** One ordered step in a Learning Roadmap (PROJECT.md §6.7). */
const milestoneSchema = new mongoose.Schema(
  {
    order: { type: Number, default: 0 },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    estimatedWeeks: { type: Number, default: 1 },
  },
  { _id: false }
);

/** A course link from the ported TF-IDF recommender (python-service). */
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    platform: { type: String, default: '' },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const suggestionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * Resume this suggestion applies to.
     * Required for 'edit' and 'skill_add'; roadmap items may be resume-independent.
     */
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
      index: true,
    },

    /**
     * - edit:      rewrite existing resume content (summary, a bullet, a project blurb)
     * - skill_add: append skills to Resume.sections.skills
     * - roadmap:   a Learning Roadmap milestone set for one skill gap
     */
    suggestionType: {
      type: String,
      enum: ['edit', 'skill_add', 'roadmap'],
      required: true,
      index: true,
    },

    /** Short card headline, e.g. "Quantify the impact of your Stripe migration" */
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160,
    },

    /**
     * The proposed change, expressed against Resume.sections.
     * Applied by sectionDiff.applyDiff() on approval — and only then.
     *
     * before/after are Mixed because a diff may target a string (summary),
     * an array (skills, bullets) or an object (an experience entry).
     */
    diff: {
      path: { type: String, default: '' },
      op: { type: String, enum: ['replace', 'add', 'remove'], default: 'replace' },
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    /**
     * Phase 4 explanation trace — populated by evaluatorAgent + criticAgent.
     * Never hand-rolled here; reuse those agents (phases-1.md §6 handoff).
     */
    explanationTrace: {
      reasoning: { type: [reasoningFactorSchema], default: [] },
      confidence: { type: Number, default: 0 }, // 0–1, same scale as Memory.confidence
      alternatives: { type: [String], default: [] },
      sources: { type: [String], default: [] },
      criticReviewed: { type: Boolean, default: false },
      criticFlagsCount: { type: Number, default: 0 },
    },

    /**
     * Roadmap payload — only populated when suggestionType === 'roadmap'.
     * `prerequisites` drives the edges in <SkillDependencyGraph>.
     */
    roadmap: {
      skill: { type: String, default: '' },
      prerequisites: { type: [String], default: [] },
      milestones: { type: [milestoneSchema], default: [] },
      courses: { type: [courseSchema], default: [] },
    },

    /** What triggered this suggestion — closes the gap→roadmap traceability loop (problem #20). */
    sourceRef: {
      matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
      jdId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobDescription', default: null },
      conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
      /** The skill-gap string this suggestion originated from, if any */
      skillGap: { type: String, default: '' },
    },

    /**
     * INVARIANT: only suggestionController may move this off 'pending'.
     */
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },

    /** When the user decided; null while pending. */
    decidedAt: {
      type: Date,
      default: null,
    },

    /** Set on approval — lets Phase 7 tie a ResumeVersion back to its Suggestion. */
    appliedVersionNumber: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Review-queue query: pending suggestions for a user, newest first
suggestionSchema.index({ userId: 1, status: 1, createdAt: -1 });
// Roadmap lookup by originating skill gap
suggestionSchema.index({ userId: 1, suggestionType: 1, 'sourceRef.jdId': 1 });

module.exports = mongoose.model('Suggestion', suggestionSchema);
