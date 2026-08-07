/**
 * Conversation Model — Phase 2
 *
 * Persists a conversation session between the user and CareerPilot's AI.
 * Each conversation has a mode (builder/coach/analyzer) set by plannerAgent.js
 * the first time — subsequent turns stay in the same mode unless explicitly switched.
 *
 * Phase 3 Context Handoff:
 *   memoryAgent.js reads `mode` to classify extracted facts (e.g., builder sessions
 *   produce career_history memories; coach sessions produce goal memories).
 */
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Human-readable title auto-generated from first user message (first 80 chars) */
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
      maxlength: 120,
    },
    /**
     * Mode set by plannerAgent.js on first message.
     * - 'builder'  → resumeBuilderAgent.js handles turns
     * - 'coach'    → careerCoachAgent.js handles turns
     * - 'analyzer' → atsAgent.js / jdAgent.js referenced inline
     */
    mode: {
      type: String,
      enum: ['builder', 'coach', 'analyzer'],
      default: 'coach',
    },
    /**
     * Optional resume context for builder/analyzer mode.
     * If set, the builder agents draft sections directly into this resume.
     */
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
    /**
     * Phase 3 extension point: which memory IDs were active during this conversation.
     * Empty in Phase 2 — populated by memoryAgent.js in Phase 3.
     */
    activeMemoryIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Conversation', conversationSchema);
