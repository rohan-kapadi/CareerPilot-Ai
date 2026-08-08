/**
 * Memory Classifier — Phase 3
 *
 * Rule-based + LLM-assisted classifier that takes a candidate fact string
 * and returns a classification payload used by memoryAgent.propose().
 *
 * Output shape:
 * {
 *   type:          'session'|'temporary'|'long_term'|'career'|'sensitive'|'hidden',
 *   category:      'skills'|'experience'|'goals'|'preferences'|'constraints'|'sensitive'|'inferred',
 *   confidence:    0–1,
 *   rationale:     string (shown on Memory Card),
 *   shouldPropose: boolean (false if confidence < 0.7),
 *   defaultExpiry: Date|null,
 * }
 *
 * Confidence scale (PROJECT.md §7.6):
 *   0.9–1.0  = Explicit statement by user
 *   0.7–0.89 = Confirmed inference
 *   < 0.70   = Unconfirmed — shouldPropose: false, never stored
 */
const { callMistralJSON } = require('../services/llmService');

// ── Sensitive pattern detection ──────────────────────────────────────────────
const SENSITIVE_PATTERNS = [
  /laid.?off|lay.?off|layoff|made redundant/i,
  /salary|compensation|pay.?range|earned|ctc|lpa/i,
  /health|illness|medical|disability|surgery|leave of absence/i,
  /gap.?year|unemployed.*month|career.?gap/i,
  /marital|married|single|divorced|spouse/i,
  /age|year.?old|dob|date of birth/i,
  /visa|immigration|citizenship|work.?permit/i,
  /pregnant|maternity|paternity/i,
  /religion|caste|ethnicity|nationality\s+is/i,
];

// ── Skill/tech keywords for fast-path career classification ─────────────────
const SKILL_TERMS = [
  'python', 'javascript', 'typescript', 'react', 'node', 'sql', 'aws', 'gcp', 'azure',
  'docker', 'kubernetes', 'git', 'machine learning', 'data science', 'nlp', 'fastapi',
  'express', 'mongodb', 'postgresql', 'redis', 'graphql', 'rest api', 'ci/cd', 'agile',
];

// ── Category inference ───────────────────────────────────────────────────────
function inferCategoryRuleBased(text) {
  const lower = text.toLowerCase();
  if (SKILL_TERMS.some(s => lower.includes(s))) return 'skills';
  if (/worked at|joined|promoted|led|managed|built|shipped|launched/i.test(lower)) return 'experience';
  if (/want to|looking for|target|applying|goal|aspire|pivot|transition/i.test(lower)) return 'goals';
  if (/prefer|like|dislike|style|prefer.*remote|prefer.*hybrid/i.test(lower)) return 'preferences';
  if (/available|location|willing to relocate|not available|notice period/i.test(lower)) return 'constraints';
  return null; // needs LLM
}

// ── Confidence from context signals ─────────────────────────────────────────
function estimateConfidence(text, role) {
  // User's own words are more reliable
  if (role === 'user') {
    // Hedging language → lower confidence
    if (/maybe|might|probably|think|not sure|roughly|around/i.test(text)) return 0.72;
    // Explicit statements → high confidence
    if (/i (am|have|worked|led|built|know|use|specialize)/i.test(text)) return 0.93;
    return 0.85; // default for user statements
  }
  // AI-inferred patterns → confirmed inference territory
  return 0.75;
}

// ── Default expiry by type ───────────────────────────────────────────────────
function defaultExpiryForType(type) {
  if (type === 'temporary') {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }
  if (type === 'sensitive') {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d;
  }
  return null;
}

/**
 * Classify a candidate memory fact.
 *
 * @param {string} content   - The extracted fact text
 * @param {string} role      - 'user' | 'assistant' (who stated it)
 * @param {string} [context] - Surrounding conversation for LLM classification
 * @returns {Promise<ClassificationResult>}
 */
async function classify(content, role = 'user', context = '') {
  // 1. Sensitive check — always overrides
  const isSensitive = SENSITIVE_PATTERNS.some(p => p.test(content));
  if (isSensitive) {
    const confidence = estimateConfidence(content, role);
    return {
      type: 'sensitive',
      category: 'sensitive',
      confidence,
      rationale: 'This appears to be sensitive personal information. I\'ll handle it with extra care.',
      shouldPropose: confidence >= 0.7,
      defaultExpiry: defaultExpiryForType('sensitive'),
      requiresReconfirmation: true,
    };
  }

  // 2. Fast-path rule-based category
  const fastCategory = inferCategoryRuleBased(content);
  const confidence = estimateConfidence(content, role);

  if (fastCategory && confidence >= 0.7) {
    const type = fastCategory === 'goals' ? 'temporary' : fastCategory === 'skills' ? 'career' : 'career';
    return {
      type,
      category: fastCategory,
      confidence,
      rationale: buildRationale(fastCategory, content),
      shouldPropose: true,
      defaultExpiry: defaultExpiryForType(type),
      requiresReconfirmation: false,
    };
  }

  // 3. LLM-assisted classification for ambiguous facts
  const systemPrompt = `You are a memory classifier for CareerPilot AI. 
Classify a candidate memory fact the user stated during career coaching.

Return JSON: {
  "type": "session"|"temporary"|"long_term"|"career"|"sensitive"|"hidden",
  "category": "skills"|"experience"|"goals"|"preferences"|"constraints"|"sensitive"|"inferred",
  "confidence": 0.0–1.0,
  "rationale": "Why I want to remember this (1–2 sentences, shown to user on Memory Card)"
}

Rules:
- confidence < 0.7 = do not propose (unconfirmed inference)
- sensitive content → type must be "sensitive"
- AI-inferred patterns user didn't explicitly state → type "hidden", confidence 0.70–0.79
- Explicit user statements → confidence 0.85+`;

  const userPrompt = `Context: "${context.slice(0, 400)}"\nFact to classify: "${content}"`;

  try {
    const result = await callMistralJSON(systemPrompt, userPrompt, 'mistral-small-latest');
    const conf = Math.min(1, Math.max(0, parseFloat(result.confidence) || 0.5));
    return {
      type: result.type || 'long_term',
      category: result.category || 'experience',
      confidence: conf,
      rationale: result.rationale || '',
      shouldPropose: conf >= 0.7,
      defaultExpiry: defaultExpiryForType(result.type),
      requiresReconfirmation: result.type === 'sensitive',
    };
  } catch (err) {
    console.error('memoryClassifier LLM error:', err.message);
    // Safe fallback: propose with moderate confidence for career category
    return {
      type: 'long_term',
      category: 'experience',
      confidence: confidence >= 0.7 ? confidence : 0,
      rationale: 'Noted from your conversation.',
      shouldPropose: confidence >= 0.7,
      defaultExpiry: null,
      requiresReconfirmation: false,
    };
  }
}

function buildRationale(category, content) {
  const rationales = {
    skills: 'To personalize skill recommendations and ATS matching in future sessions.',
    experience: 'To reference your experience when drafting resume bullets and coaching.',
    goals: 'To tailor career advice and job recommendations to your current targets.',
    preferences: 'To align future suggestions with your stated preferences.',
    constraints: 'To avoid recommending options that don\'t fit your situation.',
  };
  return rationales[category] || 'To provide more personalized career guidance.';
}

/**
 * Extract candidate facts from a conversation message using Mistral.
 * Returns up to 3 candidate fact strings.
 */
async function extractFacts(message, recentHistory = '') {
  const systemPrompt = `You are a fact extractor for a career AI assistant.
Extract factual claims about the user's career from their message — skills, experience, goals, preferences, location, and constraints.
Do NOT extract questions, greetings, or generic statements.
Return JSON: { "facts": ["fact1", "fact2"] } (max 3 facts, empty array if none found)`;

  const userPrompt = `Recent context: "${recentHistory.slice(0, 300)}"\nUser said: "${message}"`;

  try {
    const result = await callMistralJSON(systemPrompt, userPrompt, 'mistral-small-latest');
    return Array.isArray(result.facts) ? result.facts.filter(f => f && f.length > 10).slice(0, 3) : [];
  } catch {
    return [];
  }
}

module.exports = { classify, extractFacts };
