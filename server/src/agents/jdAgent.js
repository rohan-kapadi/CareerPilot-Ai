/**
 * JD Agent — Phase 1
 *
 * Ported from AdaptIQ's backend/app.py /skill-analyzer endpoint.
 * Takes raw JD text (+ optional resume sections) and returns the
 * AdaptIQ 4-field skill-gap schema by calling python-service /skill-gap.
 *
 * Called by: jdController.js
 * Uses:      pythonBridge.service.js → python-service /skill-gap
 */
const { analyzeSkillGap } = require('../services/pythonBridge.service');

/**
 * Run AdaptIQ-style skill-gap analysis on a job description.
 *
 * @param {string} rawText        - Raw JD text
 * @param {object} resumeSections - Optional resume sections (if provided, skillsFromResume is resume-specific)
 * @returns {Promise<{
 *   skillsFromResume: string[],
 *   skillsRequiredInJob: string[],
 *   matchingSkills: string[],
 *   skillsToImprove: string[],
 *   mustHave: string[],
 *   niceToHave: string[],
 *   seniority: string,
 * }>}
 */
async function analyzeJD(rawText, resumeSections = null) {
  return analyzeSkillGap(rawText, resumeSections);
}

module.exports = { analyzeJD };
