/**
 * Career Coach Agent — Phase 2
 *
 * Reworked from AdaptIQ's Groq-based coaching prompts (backend/app.py),
 * rewritten for Mistral and integrated with the CareerPilot user context.
 *
 * Features:
 * - Persona-aware tone (student/fresher/professional/switcher/recruiter)
 * - Resume context injection (skills, experience, gap analysis)
 * - Full conversation history threading
 * - Structured, actionable responses (not generic advice)
 *
 * Phase 3 Handoff:
 *   When memoryAgent.js populates citedMemoryIds on a turn, it will inject
 *   the memory content as additional context into the system prompt here.
 *   Add it as an optional `memories` param to the `coach` function.
 */
const { callMistralChat } = require('../services/llmService');

function buildSystemPrompt(userContext) {
  const { name, personaType, skills = [], experience = [], summary = '', skillsToImprove = [] } = userContext;

  const personaTone = {
    student:       'The user is a student. Use encouraging, educational language. Focus on building foundations, internships, and entry-level positioning.',
    fresher:       'The user is a recent graduate entering the job market. Focus on transferable skills, projects, and framing limited experience effectively.',
    professional:  'The user is an experienced professional. Be peer-level, data-driven, and strategic. Skip basics.',
    switcher:      'The user is making a career switch. Validate their transferable skills and guide them on bridging the gap to the new field.',
    recruiter:     'The user is a recruiter. Provide industry insights, candidate assessment frameworks, and hiring strategy.',
  };

  const toneInstruction = personaTone[personaType] || 'Be professional, empathetic, and actionable.';

  const skillContext = skills.length > 0
    ? `\nCurrent skills: ${skills.slice(0, 20).join(', ')}`
    : '';

  const gapContext = skillsToImprove.length > 0
    ? `\nSkill gaps to address: ${skillsToImprove.slice(0, 10).join(', ')}`
    : '';

  const expContext = experience.length > 0
    ? `\nMost recent role: ${experience[0].role || ''} at ${experience[0].company || ''}`
    : '';

  return `You are CareerPilot, an expert AI career coach. You are talking to ${name || 'a user'}.

${toneInstruction}

Your responses are:
✓ Specific and actionable — never generic
✓ Brief unless depth is asked for (2-4 sentences default, expand if user asks)
✓ Honest — point out weaknesses diplomatically, never sugarcoat
✓ Evidence-backed when possible (cite industry norms, data)
✓ Formatted with bullet points for lists, plain prose for conversational replies

You NEVER:
✗ Say "great question!" or use hollow affirmations
✗ Give advice longer than needed
✗ Fabricate job market statistics

USER CONTEXT:${skillContext}${expContext}${gapContext}
${summary ? `\nProfile summary: ${summary.slice(0, 200)}` : ''}

Current date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

/**
 * Generate a career coaching reply.
 * 
 * @param {string} userMessage - The new user message
 * @param {Array<{role: string, content: string}>} history - Prior turns
 * @param {object} userContext - { name, personaType, skills, experience, summary, skillsToImprove }
 * @param {string[]} [memories] - Phase 3: injected memory content strings (empty in Phase 2)
 * @returns {Promise<string>} - assistant reply text
 */
async function coach(userMessage, history = [], userContext = {}, memories = []) {
  const systemPrompt = buildSystemPrompt(userContext);

  // Build messages array: system + history + (optional memory context) + new user message
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Phase 3 will inject memory context here as a system message
  if (memories.length > 0) {
    messages.push({
      role: 'system',
      content: `Relevant facts you remember about this user:\n${memories.map(m => `• ${m}`).join('\n')}`,
    });
  }

  // Append prior conversation history (last 12 turns to stay within context)
  const recentHistory = history.slice(-12);
  for (const turn of recentHistory) {
    messages.push({ role: turn.role, content: turn.content });
  }

  // New user message
  messages.push({ role: 'user', content: userMessage });

  return callMistralChat(messages);
}

module.exports = { coach };
