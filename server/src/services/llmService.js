/**
 * LLM Service — Phase 2
 * Shared Mistral AI client for Node-side agents.
 *
 * All agents (careerCoachAgent, resumeBuilderAgent, plannerAgent) use this
 * instead of calling python-service for every LLM operation. Python-service
 * continues to handle heavy AI tasks (parsing, ATS scoring, cover letter).
 *
 * Uses the synchronous-style chat.complete() — agents are async/await so this works fine.
 */
const { Mistral } = require('@mistralai/mistralai');

let client = null;

function getClient() {
  const apiKey = process.env.MISTRAL_API_KEY || '';
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY is not configured in server .env');
  }
  if (!client) {
    client = new Mistral({ apiKey });
  }
  return client;
}

/**
 * Call Mistral for a structured JSON response.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {string} [model] - defaults to mistral-large-latest
 * @returns {Promise<object>} - parsed JSON object
 */
async function callMistralJSON(systemPrompt, userPrompt, model = 'mistral-large-latest') {
  const mistral = getClient();
  const response = await mistral.chat.complete({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    responseFormat: { type: 'json_object' },
  });

  const raw = response.choices[0].message.content.trim();
  // Strip markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Mistral did not return valid JSON: ${cleaned.slice(0, 300)}`);
  }
}

/**
 * Call Mistral for a plain text response (no JSON mode).
 * Used by careerCoachAgent for conversational replies.
 * @param {Array<{role:string,content:string}>} messages - full conversation history
 * @param {string} [model]
 * @returns {Promise<string>}
 */
async function callMistralChat(messages, model = 'mistral-large-latest') {
  const mistral = getClient();
  const response = await mistral.chat.complete({
    model,
    messages,
  });
  return response.choices[0].message.content.trim();
}

module.exports = { callMistralJSON, callMistralChat };
