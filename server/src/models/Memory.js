/**
 * Memory Model — Phase 3 (Core Innovation)
 *
 * Implements the full memory taxonomy from PROJECT.md §7.1.
 *
 * INVARIANT (must not be broken by any future phase):
 *   Only memoryController.decideMemory() may transition status to 'accepted'.
 *   memoryAgent.js ONLY creates documents with status: 'proposed'.
 *   This is the entire point of PS06 alignment.
 *
 * Phase 4 Handoff:
 *   confidence uses 0–1 float scale. evaluatorAgent.js must reuse this exact convention.
 *
 * Phase 5 Handoff:
 *   type: 'sensitive' memories require consent check via privacyAgent before proposal.
 */
const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * Memory type taxonomy (PROJECT.md §7.1)
     * - session:    current task only, never persisted across sessions
     * - temporary:  7–30 days, user-adjustable via timebox
     * - long_term:  indefinitely until revoked
     * - career:     structured career facts (skills, roles, achievements)
     * - sensitive:  PII/high-sensitivity; requires re-confirmation every 90 days
     * - hidden:     AI-inferred (not explicitly stated); MUST surface as Memory Card before any use
     */
    type: {
      type: String,
      enum: ['session', 'temporary', 'long_term', 'career', 'sensitive', 'hidden'],
      required: true,
    },

    /**
     * Semantic category (PROJECT.md §7.10)
     */
    category: {
      type: String,
      enum: ['skills', 'experience', 'goals', 'preferences', 'constraints', 'sensitive', 'inferred'],
      required: true,
    },

    /** The human-readable memory fact as it will appear on the Memory Card */
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    /**
     * Why the AI wants to remember this — shown on Memory Card as
     * "Why I want to remember this: →"
     */
    rationale: {
      type: String,
      default: '',
      maxlength: 300,
    },

    /**
     * Confidence score (0–1):
     * - 0.9–1.0:   Explicit statement by user
     * - 0.7–0.89:  Confirmed inference
     * - < 0.7:     Unconfirmed inference — memoryClassifier sets shouldPropose:false, never stored
     *
     * Phase 4: evaluatorAgent.js must reuse this same 0–1 scale.
     */
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },

    /**
     * Where this memory came from.
     */
    sourceRef: {
      turnId:         { type: mongoose.Schema.Types.ObjectId, default: null },
      conversationId: { type: mongoose.Schema.Types.ObjectId, default: null },
      resumeId:       { type: mongoose.Schema.Types.ObjectId, default: null },
    },

    /**
     * Lifecycle status.
     * INVARIANT: Only memoryController.decideMemory() may set 'accepted'.
     */
    status: {
      type: String,
      enum: ['proposed', 'accepted', 'modified', 'rejected', 'expired', 'forgotten'],
      default: 'proposed',
      index: true,
    },

    /**
     * For timebox decisions: when this memory auto-expires.
     * null = long-term (no expiry).
     */
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    /**
     * Session ID of the conversation where user rejected this fact.
     * Prevents the memoryAgent from re-proposing the same fact in the same session.
     */
    rejectedInSessionId: {
      type: String,
      default: null,
    },

    /**
     * If status='modified': the user's corrected text (original in content).
     */
    userModifiedContent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for expiry queries (expiring-soon panel, cron cleanup)
memorySchema.index({ userId: 1, expiresAt: 1, status: 1 });
// Index for proposed card polling
memorySchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Memory', memorySchema);
