/**
 * Match Model — Phase 1
 *
 * Persists a resume-JD match result including an explanationTrace stub.
 * The stub is populated by atsAgent.js now, and Phase 4's evaluatorAgent.js
 * will enrich it with weighted reasoning, confidence, and source citations.
 *
 * DO NOT remove or rename explanationTrace — Phase 4 depends on it existing here.
 */
const mongoose = require('mongoose');

/**
 * One factor in the explanation trace.
 * Matches the ExplanationTrace shape from PROJECT.md §8.
 */
const reasoningFactorSchema = new mongoose.Schema(
  {
    factor:   { type: String, required: true },
    weight:   { type: Number, default: 0 },
    score:    { type: Number, default: 0 },
    evidence: { type: String, default: '' },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
      index: true,
    },
    jdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobDescription',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** 0–100 overall ATS score */
    overallScore: {
      type: Number,
      default: 0,
    },
    /**
     * Category-level breakdown from atsAgent.js.
     * Stored as free-form object to accommodate whatever the ATS returns.
     * Phase 4 will normalize this into the explanationTrace.reasoning[] array.
     */
    categoryBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    /**
     * Phase 4 stub — populated now with basic data, enriched later by evaluatorAgent.js.
     * Shape matches PROJECT.md §8 ExplanationTrace.
     */
    explanationTrace: {
      reasoning:    { type: [reasoningFactorSchema], default: [] },
      confidence:   { type: Number, default: 0 },   // 0–1 float, matches Memory.confidence convention
      alternatives: { type: [String], default: [] },
      sources:      { type: [String], default: [] },
    },
    /** Quick-wins list from the ATS report, persisted for UI display */
    quickWins: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    /** ATS verdict text from Mistral */
    atsVerdict: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Match', matchSchema);
