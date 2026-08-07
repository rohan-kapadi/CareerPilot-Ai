/**
 * MemoryUsageLog Model — Phase 3
 *
 * Records every time an accepted memory was injected into an AI agent call.
 * Powers the "Used In" panel on the Memory Dashboard — closing the memory→consequence
 * transparency loop required by PROJECT.md §7.4.
 *
 * Also used by forgetMemory preview: "This memory was used in N past outputs."
 */
const mongoose = require('mongoose');

const memoryUsageLogSchema = new mongoose.Schema(
  {
    memoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Memory',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /**
     * What kind of AI output used this memory:
     * - 'chat'           → career coach or builder response
     * - 'ats'            → ATS score analysis
     * - 'jd'             → JD skill-gap analysis
     * - 'recommendation' → Learning Roadmap / course recommendation (Phase 6)
     */
    usedInType: {
      type: String,
      enum: ['chat', 'ats', 'jd', 'recommendation'],
      required: true,
    },
    /**
     * Reference ID for the specific output:
     * - chat  → ConversationTurn._id
     * - ats   → Match._id
     * - jd    → JobDescription._id
     */
    usedInRef: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    /** Human-readable label for the "Used In" panel (e.g. conversation title or JD title) */
    usedInLabel: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model('MemoryUsageLog', memoryUsageLogSchema);
