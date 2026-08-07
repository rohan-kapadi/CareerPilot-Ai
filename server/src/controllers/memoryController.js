/**
 * Memory Controller — Phase 3
 *
 * All endpoints that touch the Memory collection.
 * INVARIANT: decideMemory() is the ONLY function that may set status='accepted'.
 *
 * Routes:
 *   GET  /api/memory              — listMemories
 *   GET  /api/memory/proposed     — getProposed (pending cards for current user)
 *   POST /api/memory/:id/decision — decideMemory (accept/modify/reject/timebox)
 *   GET  /api/memory/:id/usage    — getMemoryUsage ("Used In" panel)
 *   POST /api/memory/:id/forget   — forgetMemory (?preview=true for impact preview)
 */
const Memory = require('../models/Memory');
const MemoryUsageLog = require('../models/MemoryUsageLog');

/**
 * GET /api/memory
 * Query: type, category, status, expiringSoon (boolean)
 */
async function listMemories(req, res) {
  const { type, category, status, expiringSoon } = req.query;
  const filter = { userId: req.userId };

  if (type)     filter.type = type;
  if (category) filter.category = category;
  if (status)   filter.status = status;
  else          filter.status = { $in: ['accepted', 'modified', 'proposed'] };

  if (expiringSoon === 'true') {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7); // expiring within 7 days
    filter.expiresAt = { $ne: null, $lte: soon, $gte: new Date() };
  }

  const memories = await Memory.find(filter)
    .sort({ updatedAt: -1 })
    .lean();

  return res.json({
    success: true,
    message: 'Memories retrieved',
    data: { memories },
  });
}

/**
 * GET /api/memory/proposed
 * Returns all pending Memory Cards waiting for user decision.
 */
async function getProposed(req, res) {
  const { conversationId } = req.query;
  const filter = { userId: req.userId, status: 'proposed' };
  if (conversationId) filter['sourceRef.conversationId'] = conversationId;

  const proposed = await Memory.find(filter).sort({ createdAt: -1 }).lean();

  return res.json({
    success: true,
    message: 'Proposed memories retrieved',
    data: { proposed },
  });
}

/**
 * POST /api/memory/:id/decision
 * Body: { action: 'accept'|'modify'|'reject'|'timebox', content?, expiresAt? }
 *
 * INVARIANT: This is the ONLY function that may set status='accepted'.
 */
async function decideMemory(req, res) {
  const { action, content, expiresAt } = req.body;
  const validActions = ['accept', 'modify', 'reject', 'timebox'];

  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      message: `action must be one of: ${validActions.join(', ')}`,
      data: null,
    });
  }

  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId });
  if (!memory) {
    return res.status(404).json({ success: false, message: 'Memory not found', data: null });
  }

  if (memory.status !== 'proposed') {
    return res.status(409).json({
      success: false,
      message: `Cannot decide on a memory with status '${memory.status}'`,
      data: null,
    });
  }

  switch (action) {
    case 'accept':
      memory.status = 'accepted';  // ← INVARIANT: only here
      break;

    case 'modify':
      if (!content?.trim()) {
        return res.status(400).json({ success: false, message: 'content is required for modify action', data: null });
      }
      memory.status = 'modified';
      memory.userModifiedContent = content.trim();
      break;

    case 'reject':
      memory.status = 'rejected';
      // Record session ID to prevent re-proposal in the same session
      if (memory.sourceRef?.conversationId) {
        memory.rejectedInSessionId = memory.sourceRef.conversationId.toString();
      }
      break;

    case 'timebox': {
      // Timebox: accept with a specific expiry date
      const expiry = expiresAt ? new Date(expiresAt) : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30); // default 30 days
        return d;
      })();
      memory.status = 'accepted';  // ← INVARIANT: only here
      memory.expiresAt = expiry;
      break;
    }
  }

  await memory.save();

  return res.json({
    success: true,
    message: `Memory ${action}ed successfully`,
    data: { memory },
  });
}

/**
 * GET /api/memory/:id/usage
 * Returns all MemoryUsageLog entries for a specific memory ("Used In" panel).
 */
async function getMemoryUsage(req, res) {
  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId });
  if (!memory) {
    return res.status(404).json({ success: false, message: 'Memory not found', data: null });
  }

  const usageLogs = await MemoryUsageLog.find({ memoryId: memory._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.json({
    success: true,
    message: 'Memory usage retrieved',
    data: {
      memory,
      usageCount: usageLogs.length,
      usageLogs,
    },
  });
}

/**
 * POST /api/memory/:id/forget
 * Query: ?preview=true → returns impact count without deleting
 *
 * Forget Flow (PROJECT.md §7.8):
 * - preview=true: show "Used in N past suggestions" impact
 * - preview=false: soft-delete (status='forgotten'), archived for 30 days
 */
async function forgetMemory(req, res) {
  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId });
  if (!memory) {
    return res.status(404).json({ success: false, message: 'Memory not found', data: null });
  }

  if (memory.status === 'forgotten') {
    return res.status(409).json({ success: false, message: 'Memory is already forgotten', data: null });
  }

  const usageCount = await MemoryUsageLog.countDocuments({ memoryId: memory._id });

  // Preview mode: return impact without deleting
  if (req.query.preview === 'true') {
    return res.json({
      success: true,
      message: 'Forget impact preview',
      data: {
        memoryId: memory._id,
        content: memory.userModifiedContent || memory.content,
        usageCount,
        usageLabel: usageCount === 0
          ? 'This memory hasn\'t been used in any AI outputs yet.'
          : `This memory was used in ${usageCount} past AI output${usageCount !== 1 ? 's' : ''}.`,
        warning: usageCount > 0
          ? 'Forgetting this memory may affect the quality of future recommendations.'
          : null,
      },
    });
  }

  // Soft-delete
  memory.status = 'forgotten';
  memory.expiresAt = (() => {
    // Permanently purged after 30 days (communicated to user)
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  })();
  await memory.save();

  return res.json({
    success: true,
    message: 'Memory forgotten. It will be permanently purged in 30 days.',
    data: { memory },
  });
}

module.exports = { listMemories, getProposed, decideMemory, getMemoryUsage, forgetMemory };
