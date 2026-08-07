/**
 * Roadmap API — Phase 6
 *
 * skillGapId is either a JobDescription id or a URL-encoded skill name —
 * see server/src/controllers/roadmapController.js for why.
 */
import api from '../services/api';

/** GET /api/roadmap/:skillGapId — fetch existing roadmap suggestions */
export const getRoadmap = (skillGapId, skill) =>
  api.get(`/roadmap/${encodeURIComponent(skillGapId)}`, skill ? { params: { skill } } : {});

/** POST /api/roadmap/:skillGapId/generate — propose roadmap milestones (pending) */
export const generateRoadmap = (skillGapId, payload = {}) =>
  api.post(`/roadmap/${encodeURIComponent(skillGapId)}/generate`, payload);
