/**
 * Chat Controller — Phase 2
 *
 * POST /api/chat      — send a message, get AI reply (creates conversation on first message)
 * GET  /api/chat/:id  — fetch a full conversation with all turns
 * GET  /api/chat       — list user's conversations
 */
const Conversation = require('../models/Conversation');
const ConversationTurn = require('../models/ConversationTurn');
const Resume = require('../models/Resume.model');
const User = require('../models/User.model');
const { plan } = require('../agents/plannerAgent');
const { coach } = require('../agents/careerCoachAgent');
const { draftSection, getOpeningQuestion } = require('../agents/resumeBuilderAgent');
const memoryAgent = require('../agents/memoryAgent');

/**
 * Build the user context object passed to agents.
 * Merges User profile + optionally Resume.sections.
 */
async function buildUserContext(userId, resumeId = null) {
  const user = await User.findById(userId).lean();
  if (!user) throw new Error('User not found');

  const context = {
    name:        user.name,
    personaType: user.personaType,
    skills:      user.skills || [],
    experience:  user.experience || [],
    education:   user.education || [],
    summary:     user.summary || '',
    tagline:     user.tagline || '',
    jobTitle:    user.jobTitle || '',
  };

  // Optionally layer in resume sections for richer context
  if (resumeId) {
    const resume = await Resume.findOne({ _id: resumeId, userId }).lean();
    if (resume) {
      context.skills      = resume.sections?.skills || context.skills;
      context.experience  = resume.sections?.experience || context.experience;
      context.summary     = resume.sections?.summary || context.summary;
      context.sections    = resume.sections;
      context.atsScore    = resume.atsScore;
      context.skillsToImprove = resume.missingSkills || [];
    }
  }

  return context;
}

/**
 * POST /api/chat
 * Body: { message, conversationId?, resumeId?, mode?, section? }
 *   - conversationId: continue existing; omit to create new
 *   - mode: 'builder' | 'coach' | 'analyzer' (only on first message)
 *   - section: current builder section (required when mode=builder)
 */
async function sendMessage(req, res) {
  const { message, conversationId, resumeId, mode: bodyMode, section } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'message is required', data: null });
  }

  // ── 1. Resolve or create conversation ──
  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, userId: req.userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found', data: null });
    }
  } else {
    // New conversation — set title from first message
    const title = message.trim().slice(0, 80);
    conversation = await Conversation.create({
      userId:   req.userId,
      title,
      mode:     bodyMode || 'coach',
      resumeId: resumeId || null,
    });
  }

  // ── 2. Persist the user's turn ──
  await ConversationTurn.create({
    conversationId: conversation._id,
    userId:         req.userId,
    role:           'user',
    content:        message.trim(),
  });

  // ── 3. Load conversation history for agent context ──
  const history = await ConversationTurn.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .select('role content')
    .lean();

  // ── 4. Run planner → route to correct agent ──
  const plannedIntent = await plan(message, {
    userId:         req.userId,
    conversationId: conversation._id,
    mode:           conversation.mode,
    history:        history.map(t => ({ role: t.role, content: t.content })),
  });

  // Update conversation mode if planner changed it
  if (plannedIntent.intent !== conversation.mode && conversation.mode === 'coach') {
    conversation.mode = plannedIntent.intent;
    await conversation.save();
  }

  // ── 5. Build user context ──
  const userContext = await buildUserContext(req.userId, conversation.resumeId?.toString());

  // ── 6. Call the right agent (with memory context for coach) ──
  let assistantContent = '';
  let sectionDraft = {};
  let citedMemoryIds = [];

  if (plannedIntent.intent === 'builder') {
    const targetSection = section || 'summary';
    const currentSections = userContext.sections || {};
    const result = await draftSection(targetSection, message, currentSections, userContext);

    assistantContent = result.nextQuestion;
    sectionDraft = {
      section:         result.section,
      draft:           result.draft,
      nextQuestion:    result.nextQuestion,
      sectionComplete: result.sectionComplete,
    };
  } else {
    // Phase 3: Inject accepted memories into coach context
    // injectContext also writes MemoryUsageLog entries
    const memCtx = await memoryAgent.injectContext(
      req.userId,
      conversation._id.toString(),
      null // turnId — will be set below after assistant turn is created
    );
    citedMemoryIds = memCtx.memoryIds;

    assistantContent = await coach(
      message,
      history.map(t => ({ role: t.role, content: t.content })),
      userContext,
      memCtx.contextStrings   // Phase 3: injected memory facts
    );
  }

  // ── 7. Persist assistant turn with citedMemoryIds ──
  const assistantTurn = await ConversationTurn.create({
    conversationId: conversation._id,
    userId:         req.userId,
    role:           'assistant',
    content:        assistantContent,
    citedMemoryIds, // Phase 3: populated for coach turns
    toolCall: {
      agentName:  plannedIntent.intent === 'builder' ? 'resumeBuilderAgent' : 'careerCoachAgent',
      intent:     plannedIntent.intent,
      confidence: plannedIntent.confidence,
    },
    sectionDraft: Object.keys(sectionDraft).length > 0 ? sectionDraft : undefined,
  });

  // Phase 3: Log memory usage for transparency ("Used In" panel)
  if (citedMemoryIds.length > 0) {
    await memoryAgent.logUsage(req.userId, citedMemoryIds, assistantTurn._id, conversation._id);
  }

  return res.status(201).json({
    success: true,
    message: 'Message sent',
    data: {
      conversationId: conversation._id,
      mode:           conversation.mode,
      reply: {
        content:     assistantContent,
        sectionDraft: sectionDraft || null,
        intent:      plannedIntent.intent,
      },
    },
  });
}

/**
 * GET /api/chat/:id
 * Fetch full conversation with all turns.
 */
async function getConversation(req, res) {
  const conversation = await Conversation.findOne({
    _id:    req.params.id,
    userId: req.userId,
  });

  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found', data: null });
  }

  const turns = await ConversationTurn.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .lean();

  return res.json({
    success: true,
    message: 'Conversation retrieved',
    data: { conversation, turns },
  });
}

/**
 * GET /api/chat
 * List all conversations for current user (newest first).
 */
async function listConversations(req, res) {
  const conversations = await Conversation.find({ userId: req.userId })
    .sort({ updatedAt: -1 })
    .lean();

  return res.json({
    success: true,
    message: 'Conversations retrieved',
    data: { conversations },
  });
}

module.exports = { sendMessage, getConversation, listConversations };
