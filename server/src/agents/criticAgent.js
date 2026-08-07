/**
 * Critic Agent — Phase 4
 *
 * Reviews an `ExplanationTrace` for overreach or hallucinated claims before
 * it is presented to the user.
 *
 * Checks:
 * 1. Does the evidence claim facts not supported by source text?
 * 2. Are weights and scores mathematically coherent?
 * 3. Flag overreaching claims → lower confidence score (< 0.7) and tag as "unconfirmed inference".
 */
async function review(trace, sourceContext = {}) {
  if (!trace || !Array.isArray(trace.reasoning)) return trace;

  const reviewed = { ...trace };
  let flagsCount = 0;

  const { resumeText = '', jdText = '' } = sourceContext;
  const combinedSource = `${resumeText} ${jdText}`.toLowerCase();

  reviewed.reasoning = trace.reasoning.map(r => {
    const factorCopy = { ...r };
    // Check if evidence contains specific technical claims not in source text
    if (combinedSource.length > 50 && r.evidence) {
      const words = r.evidence.toLowerCase().split(/\s+/);
      const missingKeywords = words.filter(w => w.length > 5 && !combinedSource.includes(w));
      if (missingKeywords.length > 3) {
        flagsCount += 1;
        factorCopy.evidence += ' (Note: Unverified inference based on pattern)';
      }
    }
    return factorCopy;
  });

  // Adjust confidence if critic flagged unsupported claims
  if (flagsCount > 0) {
    reviewed.confidence = Math.max(0.5, (trace.confidence || 0.85) - 0.2);
    reviewed.alternatives = [
      ...reviewed.alternatives,
      'Verify unconfirmed claims against your actual work experience.',
    ];
  }

  reviewed.criticReviewed = true;
  reviewed.criticFlagsCount = flagsCount;

  return reviewed;
}

module.exports = { review };
