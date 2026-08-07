/**
 * Match API — Phase 1
 * Wraps /api/matching endpoints.
 */
import api from '../services/api';

/** POST /api/matching — run persisted ATS match */
export const matchResumeToJD = (resumeId, jdId) =>
  api.post('/matching', { resumeId, jdId });

/** GET /api/matching/:id — fetch a single match result */
export const getMatch = (id) => api.get(`/matching/${id}`);

/** GET /api/matching — list all matches for current user */
export const listMatches = () => api.get('/matching');
