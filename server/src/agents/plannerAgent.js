/**
 * Planner Agent — Phase 2
 *
 * Intent router: inspects incoming user message + conversation context
 * and decides which agent should handle the turn.
 *
 * Intents:
 *   'builder'  → resumeBuilderAgent (section drafting)
 *   'coach'    → careerCoachAgent (open-ended career guidance)
 *   'analyzer' → inline ATS/JD analysis response (no agent, handled by chatController)
 *
 * Phase 3 Context Handoff:
 *   Phase 3's memoryAgent.js must be invoked FROM WITHIN this planner.
 *   The `middleware` array below is the extension point — just push an async function:
 *     plannerAgent.middleware.push(async (ctx) => { await memoryAgent.extract(ctx); });
 *   The planner calls each middleware after intent detection, passing the full context object.
 */
const { callMistralJSON } = require('../services/llmService');

/**
 * Extension point for Phase 3+ agents.
 * Each middleware is called after intent detection with the full planning context.
 * Middleware signature: async (ctx: PlannerContext) => void
 */
const middleware = [];

const INTENT_SYSTEM = `You are an intent classifier for CareerPilot AI, a career assistant.
Classify the user's message into exactly one of these intents:
- "builder": user wants help writing or improving a specific resume section (summary, experience, education, skills, projects)
- "coach": user wants career advice, interview prep, job search strategy, or open-ended guidance  
- "analyzer": user wants to analyze a job description, check ATS score, or compare resume to a role
Return JSON: { "intent": "builder"|"coach"|"analyzer", "confidence": 0.0-1.0, "reasoning": "brief explanation" }`;

/**
 * Keyword-based fast path — avoids Mistral call for unambiguous cases.
 */
function fastPathIntent(message) {
  const lower = message.toLowerCase();
  
  const builderKeywords = ['write my', 'draft my', 'help me write', 'build my resume', 'update my summary', 
    'improve my experience', 'add to my skills', 'write a bullet', 'rewrite my'];
  const analyzerKeywords = ['ats score', 'analyze this job', 'check my resume against', 'job description', 
    'how do i match', 'keyword match', 'paste the jd'];
  
  if (builderKeywords.some(k => lower.includes(k))) return { intent: 'builder', confidence: 0.95, reasoning: 'keyword match' };
  if (analyzerKeywords.some(k => lower.includes(k))) return { intent: 'analyzer', confidence: 0.95, reasoning: 'keyword match' };
  return null;
}

/**
 * @param {string} userMessage
 * @param {{ mode: string, history: Array<{role,content}> }} conversationContext
 * @returns {Promise<{ intent: string, confidence: number, reasoning: string }>}
 */
async function plan(userMessage, conversationContext = {}) {
  // 1. Fast-path keyword check
  const fast = fastPathIntent(userMessage);
  if (fast) {
    await runMiddleware({ intent: fast.intent, userMessage, conversationContext });
    return fast;
  }

  // 2. Inherit conversation mode (avoid mode-switching mid-conversation unless very confident)
  if (conversationContext.mode && conversationContext.mode !== 'coach') {
    // Sticky mode: stay in current mode unless message is clearly off-topic
    await runMiddleware({ intent: conversationContext.mode, userMessage, conversationContext });
    return { intent: conversationContext.mode, confidence: 0.8, reasoning: 'sticky mode' };
  }

  // 3. LLM-based classification for ambiguous cases
  try {
    const recentHistory = (conversationContext.history || [])
      .slice(-4)
      .map(t => `${t.role}: ${t.content}`)
      .join('\n');

    const userPrompt = `Recent conversation:\n${recentHistory || '(first message)'}\n\nNew message: "${userMessage}"\n\nClassify the intent.`;
    const result = await callMistralJSON(INTENT_SYSTEM, userPrompt, 'mistral-small-latest');
    
    const intent = ['builder', 'coach', 'analyzer'].includes(result.intent) ? result.intent : 'coach';
    const classified = { intent, confidence: result.confidence ?? 0.7, reasoning: result.reasoning ?? '' };
    
    await runMiddleware({ ...classified, userMessage, conversationContext });
    return classified;
  } catch (err) {
    console.error('Planner LLM error, defaulting to coach:', err.message);
    return { intent: 'coach', confidence: 0.5, reasoning: 'fallback' };
  }
}

async function runMiddleware(ctx) {
  for (const mw of middleware) {
    try { await mw(ctx); } catch (err) { console.error('Planner middleware error:', err.message); }
  }
}

module.exports = { plan, middleware };
