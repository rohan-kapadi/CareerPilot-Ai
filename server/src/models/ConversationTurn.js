/**
 * ConversationTurn Model — Phase 2
 *
 * One message in a conversation (either user or assistant).
 *
 * Phase 3 Context Handoff:
 *   - `citedMemoryIds` is ALWAYS EMPTY in Phase 2.
 *     Phase 3's memoryAgent.js must populate this when the Career Coach
 *     references a memory fact in its reply. Do NOT rename or remove this field.
 *   - `toolCall` records which agent handled this turn — used by Phase 4
 *     explainabilityAgent.js to reconstruct why a particular response was given.
 */
const mongoose = require('mongoose');

const conversationTurnSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** 'user' | 'assistant' */
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    /** The message text content */
    content: {
      type: String,
      required: true,
    },
    /**
     * Which memory IDs this assistant turn cited/used.
     * Empty in Phase 2 — Phase 3 memoryAgent.js fills this in.
     * Shape: ObjectId[] → ref 'Memory'
     */
    citedMemoryIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    /**
     * Which agent processed this turn (for Phase 4 explainability).
     * Populated only on 'assistant' role turns.
     */
    toolCall: {
      agentName:  { type: String, default: '' },   // e.g. 'careerCoachAgent'
      intent:     { type: String, default: '' },   // e.g. 'coach'
      confidence: { type: Number, default: 0 },    // planner confidence 0-1
    },
    /**
     * For builder mode: the structured section draft returned by resumeBuilderAgent.
     * Stored so the UI can re-render the draft accept/reject chip on page refresh.
     */
    sectionDraft: {
      section:    { type: String, default: null },
      draft:      { type: mongoose.Schema.Types.Mixed, default: null },
      nextQuestion: { type: String, default: null },
      sectionComplete: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ConversationTurn', conversationTurnSchema);
