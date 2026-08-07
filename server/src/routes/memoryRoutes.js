const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  listMemories,
  getProposed,
  decideMemory,
  getMemoryUsage,
  forgetMemory,
} = require('../controllers/memoryController');

router.use(authMiddleware);

// List accepted/proposed memories (filterable)
router.get('/', listMemories);

// Get pending Memory Cards (proposed, awaiting user decision)
router.get('/proposed', getProposed);

// User decision on a Memory Card: accept | modify | reject | timebox
router.post('/:id/decision', decideMemory);

// "Used In" transparency panel for a specific memory
router.get('/:id/usage', getMemoryUsage);

// Forget flow (?preview=true for impact preview, no ?preview for soft-delete)
router.post('/:id/forget', forgetMemory);

module.exports = router;
