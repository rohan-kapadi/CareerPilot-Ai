/**
 * Suggestion Routes — Phase 6 (Human Approval Workflow)
 *
 * Note: /bulk-approve is declared before /:id/* so Express never treats
 * "bulk-approve" as a suggestion id.
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  listSuggestions,
  generateSuggestions,
  approveSuggestion,
  rejectSuggestion,
  bulkApprove,
  acceptSectionDraft,
} = require('../controllers/suggestionController');

router.use(authMiddleware);

// Review queue
router.get('/', listSuggestions);

// Run the Recommendation Agent — creates pending suggestions only
router.post('/generate', generateSuggestions);

// Resume Builder inline accept — routes Phase 2's draft writes through this model
router.post('/from-draft', acceptSectionDraft);

// Bulk approve with second-confirmation count
router.post('/bulk-approve', bulkApprove);

// Per-suggestion decisions — approve is the only path to Resume.sections
router.post('/:id/approve', approveSuggestion);
router.post('/:id/reject', rejectSuggestion);

module.exports = router;
