/**
 * JobDescription Model — Phase 1
 *
 * Persists a raw JD plus AdaptIQ's 4-field structured extraction.
 * Stateless JD analysis (/api/job/ats-score) continues to exist for the
 * current UI — this model backs the new /api/jds persistent endpoint.
 *
 * Field names intentionally match AdaptIQ's ported schema:
 *   skillsFromResume    ← skills_from_resume
 *   skillsRequiredInJob ← skills_required_in_job
 *   matchingSkills      ← matching_skills
 *   skillsToImprove     ← skills_to_improve
 */
const mongoose = require('mongoose');

const jobDescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rawText: {
      type: String,
      required: [true, 'Job description text is required'],
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    /**
     * AdaptIQ 4-field skill-gap extraction result.
     * Populated by jdAgent.js after calling python-service /skill-gap.
     * resumeId is optional — if provided, skillsFromResume is resume-specific.
     */
    extracted: {
      skillsFromResume:    { type: [String], default: [] },
      skillsRequiredInJob: { type: [String], default: [] },
      matchingSkills:      { type: [String], default: [] },
      skillsToImprove:     { type: [String], default: [] },
      // Bonus fields from the structured extraction
      mustHave:    { type: [String], default: [] },
      niceToHave:  { type: [String], default: [] },
      seniority:   { type: String, default: '' },
    },
    /**
     * Optional back-reference: which resume was used for the gap analysis.
     * Null if JD was saved without a resume context.
     */
    analyzedWithResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('JobDescription', jobDescriptionSchema);
