/**
 * ATS Agent — Phase 1
 *
 * Wraps the python-service /ats-score call and normalizes the result
 * into the Match model's shape: { overallScore, categoryBreakdown, explanationTrace, quickWins, atsVerdict }.
 *
 * The explanationTrace is a stub here — Phase 4's evaluatorAgent.js will
 * enrich it with weighted reasoning, confidence scores, and source citations.
 * DO NOT change the output shape — Phase 4 depends on it.
 *
 * Called by: matchController.js
 * Uses:      pythonBridge.service.js → python-service /ats-score
 */
const { fetchATSScore } = require('../services/pythonBridge.service');

/**
 * Run ATS analysis and normalize into Match model shape.
 *
 * @param {object} resumeSections  - Resume sections object (from Resume.sections)
 * @param {string} jobDescription  - Raw JD text
 * @param {string[]} resumeSkills  - Resume skills array (for embedding match)
 * @returns {Promise<{
 *   overallScore: number,
 *   categoryBreakdown: object,
 *   explanationTrace: object,
 *   quickWins: object[],
 *   atsVerdict: string,
 * }>}
 */
async function runATSMatch(resumeSections, jobDescription) {
  const report = await fetchATSScore(resumeSections, jobDescription);

  // Normalize into Match model shape
  const overallScore = report.overall_score ?? 0;
  const categoryBreakdown = report.breakdown ?? {};
  const quickWins = report.quick_wins ?? [];
  const atsVerdict = report.ats_verdict ?? '';

  /**
   * Phase 1 explanationTrace stub.
   * Confidence is derived from the ATS score (0–1 scale).
   * Phase 4's evaluatorAgent.js will replace reasoning[] with a structured breakdown.
   */
  const explanationTrace = {
    reasoning: [
      {
        factor: 'Keyword match',
        weight: 0.25,
        score: (categoryBreakdown.keyword_match?.score ?? 0) / 100,
        evidence: `Matched: ${(categoryBreakdown.keyword_match?.matched ?? []).join(', ') || 'none'}`,
      },
      {
        factor: 'Skills alignment',
        weight: 0.25,
        score: (categoryBreakdown.skills_alignment?.score ?? 0) / 100,
        evidence: `${categoryBreakdown.skills_alignment?.matched_count ?? 0} of ${categoryBreakdown.skills_alignment?.total_required ?? 0} required skills matched`,
      },
      {
        factor: 'Section structure',
        weight: 0.20,
        score: (categoryBreakdown.section_structure?.score ?? 0) / 100,
        evidence: `Present: ${(categoryBreakdown.section_structure?.present ?? []).join(', ') || 'none'}`,
      },
      {
        factor: 'Action verbs',
        weight: 0.15,
        score: (categoryBreakdown.action_verbs?.score ?? 0) / 100,
        evidence: `${categoryBreakdown.action_verbs?.count ?? 0} strong action verbs found`,
      },
      {
        factor: 'Formatting',
        weight: 0.15,
        score: (categoryBreakdown.formatting_score?.score ?? 0) / 100,
        evidence: (categoryBreakdown.formatting_score?.issues ?? []).join(', ') || 'No formatting issues',
      },
    ],
    confidence: parseFloat((overallScore / 100).toFixed(2)),
    alternatives: quickWins.slice(0, 3).map((w) => w.action ?? '').filter(Boolean),
    sources: ['resume.sections', 'jd.rawText'],
  };

  return { overallScore, categoryBreakdown, explanationTrace, quickWins, atsVerdict };
}

module.exports = { runATSMatch };
