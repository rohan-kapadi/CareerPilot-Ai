/**
 * Suggestion API — Phase 6 (Human Approval Workflow)
 * Wraps /api/suggestions. Approving is the only way AI content reaches a resume.
 */
import api from '../services/api';

/** GET /api/suggestions — review queue (status: 'pending' | 'accepted' | 'rejected' | 'all') */
export const listSuggestions = (params = {}) => api.get('/suggestions', { params });

/** POST /api/suggestions/generate — run the Recommendation Agent (creates pending only) */
export const generateSuggestions = (payload) => api.post('/suggestions/generate', payload);

/** POST /api/suggestions/:id/approve — applies the diff to the resume */
export const approveSuggestion = (id, force = false) =>
  api.post(`/suggestions/${id}/approve${force ? '?force=true' : ''}`);

/** POST /api/suggestions/:id/reject */
export const rejectSuggestion = (id) => api.post(`/suggestions/${id}/reject`);

/**
 * POST /api/suggestions/bulk-approve
 * confirmedCount must equal ids.length — the server refuses a mismatch so an
 * accidental mass-approve can't slip through (PROJECT.md §10).
 */
export const bulkApproveSuggestions = (ids) =>
  api.post('/suggestions/bulk-approve', { ids, confirmedCount: ids.length });

/**
 * POST /api/suggestions/from-draft
 * Resume Builder inline accept. Routes the AI draft through the Suggestion
 * model instead of overwriting Resume.sections directly.
 */
export const acceptSectionDraft = ({ resumeId, draft, section, conversationId, autoApprove = true }) =>
  api.post('/suggestions/from-draft', { resumeId, draft, section, conversationId, autoApprove });
