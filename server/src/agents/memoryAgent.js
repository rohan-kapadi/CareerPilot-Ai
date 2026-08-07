/**
 * Memory Agent — Phase 3 (Core Innovation)
 *
 * The central component of PS06 alignment. Responsibilities:
 *
 *   1. extract(ctx)          — invoked from plannerAgent.middleware after each user turn
 *                              Scans message for candidate facts → proposes Memory Cards
 *   2. propose(...)          — creates Memory with status: 'proposed' (NEVER 'accepted')
 *   3. getProposed(...)      — returns pending proposed cards for the chat UI
 *   4. injectContext(...)    — retrieves accepted memories for agent context + logs usage
 *
 * INVARIANT:
 *   This agent NEVER writes status: 'accepted' to the Memory collection.
 *   ONLY memoryController.decideMemory() may do that.
 *   Breaking this rule breaks the PS06 negotiation guarantee.
 *
 * Phase 3 Wiring (done in app.js startup):
 *   plannerAgent.middleware.push(async (ctx) => memoryAgent.extract(ctx));
 *
 * Phase 5 Handoff:
 *   Before proposing type: 'sensitive', call privacyAgent.checkConsent(userId, 'chat_memory').
 *   Wire this in Phase 5 — the check point is marked with TODO:PHASE5 below.
 */
const Memory = require('../models/Memory');
const MemoryUsageLog = require('../models/MemoryUsageLog');
const { classify, extractFacts } = require('../utils/memoryClassifier');
const privacyAgent = require('./privacyAgent');

/**
 * Extract candidate facts from a user message and create proposed Memory Cards.
 * Called from plannerAgent.middleware — fires asynchronously so it doesn't block the reply.
 *
 * @param {object} ctx - Planner context:
 *   { intent, userMessage, conversationContext: { userId, conversationId, turnId, history } }
 */
async function extract(ctx) {
  const { userMessage, conversationContext } = ctx;
  if (!conversationContext?.userId) return;

  const { userId, conversationId, turnId } = conversationContext;

  // Only extract from user messages (not AI-generated turns)
  if (!userMessage || userMessage.length < 15) return;

  try {
    const recentHistory = (conversationContext.history || [])
      .slice(-3)
      .map(t => `${t.role}: ${t.content}`)
      .join('\n');

    // Extract candidate facts from the message
    const facts = await extractFacts(userMessage, recentHistory);
    if (!facts.length) return;

    for (const factText of facts) {
      await propose(userId, factText, 'user', recentHistory, {
        conversationId,
        turnId,
        sessionId: conversationId?.toString(),
      });
    }
  } catch (err) {
    // Memory extraction is non-critical — don't let it break the chat
    console.error('memoryAgent.extract error:', err.message);
  }
}

/**
 * Classify and create a proposed Memory Card.
 * NEVER sets status: 'accepted'.
 *
 * @param {string} userId
 * @param {string} content        - The fact text
 * @param {string} role           - 'user' | 'assistant'
 * @param {string} context        - Surrounding conversation context
 * @param {object} sourceRef      - { conversationId, turnId, resumeId, sessionId }
 */
async function propose(userId, content, role = 'user', context = '', sourceRef = {}) {
  const classification = await classify(content, role, context);

  if (!classification.shouldPropose) {
    // Confidence < 0.7: unconfirmed inference — never propose or store
    return null;
  }

  // PHASE5 — Before proposing sensitive type, check consent:
  if (classification.type === 'sensitive') {
    const consentGranted = await privacyAgent.hasConsent(userId, 'chat_memory', 'sensitive_memory');
    if (!consentGranted) {
      console.log(`Privacy blocked sensitive memory proposal for user ${userId}`);
      return null;
    }
  }

  // Check if this same fact was already proposed/accepted/rejected this session
  if (sourceRef.sessionId) {
    const existing = await Memory.findOne({
      userId,
      content: { $regex: new RegExp(content.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      status: { $in: ['proposed', 'accepted', 'modified'] },
      rejectedInSessionId: { $ne: sourceRef.sessionId },
    });
    if (existing) return null; // avoid duplicate proposals
  }

  const memory = await Memory.create({
    userId,
    type: classification.type,
    category: classification.category,
    content: content.trim(),
    rationale: classification.rationale,
    confidence: classification.confidence,
    sourceRef: {
      turnId:         sourceRef.turnId || null,
      conversationId: sourceRef.conversationId || null,
      resumeId:       sourceRef.resumeId || null,
    },
    status: 'proposed',   // ← INVARIANT: always 'proposed', never 'accepted'
    expiresAt: classification.defaultExpiry,
  });

  return memory;
}

/**
 * Return all proposed (pending) Memory Cards for a user.
 * Used by useMemoryCards.js hook to render Memory Card overlays in chat.
 *
 * @param {string} userId
 * @param {string} [conversationId] - Optional: filter to current conversation
 */
async function getProposed(userId, conversationId = null) {
  const filter = { userId, status: 'proposed' };
  if (conversationId) {
    filter['sourceRef.conversationId'] = conversationId;
  }
  return Memory.find(filter).sort({ createdAt: -1 }).lean();
}

/**
 * Retrieve accepted memories relevant to the current conversation and inject them
 * as context strings for the agent system prompt.
 *
 * Also writes MemoryUsageLog entries (for "Used In" panel).
 *
 * @param {string} userId
 * @param {string} conversationId - For usage logging
 * @param {string} turnId         - ConversationTurn being generated
 * @returns {Promise<{ contextStrings: string[], memoryIds: string[] }>}
 */
async function injectContext(userId, conversationId, turnId) {
  const accepted = await Memory.find({
    userId,
    status: { $in: ['accepted', 'modified'] },
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  })
    .sort({ confidence: -1, updatedAt: -1 })
    .limit(15)
    .lean();

  if (!accepted.length) return { contextStrings: [], memoryIds: [] };

  // Build context strings for agent system prompt
  const contextStrings = accepted.map(m => {
    const status = m.status === 'modified' ? '(user-corrected)' : '';
    return `• [${m.category}] ${m.userModifiedContent || m.content} ${status}`.trim();
  });

  // Log usage for "Used In" transparency
  const usagePromises = accepted.map(m =>
    MemoryUsageLog.create({
      memoryId:   m._id,
      userId,
      usedInType: 'chat',
      usedInRef:  turnId || null,
      usedInLabel: `Conversation turn`,
    }).catch(() => null) // non-critical
  );
  await Promise.all(usagePromises);

  return {
    contextStrings,
    memoryIds: accepted.map(m => m._id.toString()),
  };
}

/**
 * Log usage of accepted memories for a specific assistant turn.
 */
async function logUsage(userId, memoryIds = [], turnId = null, conversationId = null) {
  if (!memoryIds.length) return;
  const promises = memoryIds.map(mId =>
    MemoryUsageLog.create({
      memoryId:   mId,
      userId,
      usedInType: 'chat',
      usedInRef:  turnId || conversationId || null,
      usedInLabel: 'Conversation turn',
    }).catch(() => null)
  );
  await Promise.all(promises);
}

/**
 * Check if a memory was rejected in the current session (to suppress re-proposal).
 */
async function wasRejectedThisSession(userId, content, sessionId) {
  const rejected = await Memory.findOne({
    userId,
    content: { $regex: new RegExp(content.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    status: 'rejected',
    rejectedInSessionId: sessionId,
  });
  return !!rejected;
}

module.exports = { extract, propose, getProposed, injectContext, logUsage, wasRejectedThisSession };
