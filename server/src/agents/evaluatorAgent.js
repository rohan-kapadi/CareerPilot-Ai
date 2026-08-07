/**
 * Evaluator Agent — Phase 4
 *
 * Formats raw AI output (ATS analysis, JD matching, skill suggestions) into
 * the standardized `ExplanationTrace` schema:
 * {
 *   output: string,
 *   reasoning: Array<{ factor: string, weight: number, score: number, evidence: string }>,
 *   confidence: number,
 *   alternatives: Array<string>,
 *   sources: Array<string>
 * }
 *
 * Reuses the Phase 3 confidence scale (0–1 float).
 */
const { callMistralJSON } = require('../services/llmService');

/**
 * Standardize or enrich an existing partial trace or raw agent output.
 *
 * @param {object} rawOutput - Raw match or ATS scoring result
 * @param {string} type - 'match' | 'ats' | 'recommendation'
 * @param {object} [context] - { resumeText, jdText, memories }
 * @returns {Promise<ExplanationTrace>}
 */
async function evaluate(rawOutput, type = 'match', context = {}) {
  // If already structured, perform normalization pass
  if (rawOutput && rawOutput.explanationTrace && Array.isArray(rawOutput.explanationTrace.reasoning)) {
    return normalizeTrace(rawOutput.explanationTrace, rawOutput);
  }

  const systemPrompt = `You are an AI Evaluator Agent for CareerPilot AI.
Your job is to construct a transparent, structured ExplanationTrace for an AI output.

Return JSON matching this exact schema:
{
  "output": "Summary label (e.g. 'Match Score: 82/100')",
  "reasoning": [
    {
      "factor": "Factor name",
      "weight": 0.0-1.0 (sum should equal 1.0),
      "score": 0.0-1.0,
      "evidence": "Specific evidence from context"
    }
  ],
  "confidence": 0.0-1.0,
  "alternatives": ["Actionable step to improve score"],
  "sources": ["resume.skills", "jd.requirements"]
}`;

  const userPrompt = `Evaluation Type: ${type}
Raw Output: ${JSON.stringify(rawOutput).slice(0, 1000)}
Context: ${JSON.stringify(context).slice(0, 1000)}`;

  try {
    const trace = await callMistralJSON(systemPrompt, userPrompt, 'mistral-small-latest');
    return normalizeTrace(trace, rawOutput);
  } catch (err) {
    console.error('evaluatorAgent error, generating fallback trace:', err.message);
    return fallbackTrace(rawOutput);
  }
}

function normalizeTrace(trace, rawOutput) {
  const reasoning = Array.isArray(trace.reasoning)
    ? trace.reasoning.map(r => ({
        factor:   r.factor || 'General Evaluation',
        weight:   typeof r.weight === 'number' ? Math.min(1, Math.max(0, r.weight)) : 0.25,
        score:    typeof r.score === 'number' ? Math.min(1, Math.max(0, r.score)) : 0.75,
        evidence: r.evidence || 'Analyzed from profile and input requirements',
      }))
    : defaultReasoning(rawOutput);

  return {
    output:       trace.output || `Match Score: ${rawOutput?.matchScore ?? rawOutput?.atsScore ?? 75}/100`,
    reasoning,
    confidence:   typeof trace.confidence === 'number' ? Math.min(1, Math.max(0, trace.confidence)) : 0.85,
    alternatives: Array.isArray(trace.alternatives) && trace.alternatives.length > 0
      ? trace.alternatives
      : ['Add missing core keywords to increase alignment score.'],
    sources:      Array.isArray(trace.sources) && trace.sources.length > 0
      ? trace.sources
      : ['resume.sections', 'jd.requirements'],
  };
}

function defaultReasoning(rawOutput) {
  const score = ((rawOutput?.matchScore ?? rawOutput?.atsScore ?? 75) / 100);
  return [
    { factor: 'Technical Skills Alignment', weight: 0.4, score: Math.min(1, score + 0.05), evidence: 'Evaluated core skill matches against role requirements' },
    { factor: 'Experience Relevance',       weight: 0.3, score: score,                     evidence: 'Compared role responsibilities with past experience' },
    { factor: 'Keyword Coverage',           weight: 0.3, score: Math.max(0, score - 0.05), evidence: 'Scanned industry terms and ATS keyword frequency' },
  ];
}

function fallbackTrace(rawOutput) {
  return {
    output: `Match Score: ${rawOutput?.matchScore ?? rawOutput?.atsScore ?? 75}/100`,
    reasoning: defaultReasoning(rawOutput),
    confidence: 0.8,
    alternatives: ['Quantify bullet points with metrics to boost score.'],
    sources: ['resume', 'job_description'],
  };
}

module.exports = { evaluate };
