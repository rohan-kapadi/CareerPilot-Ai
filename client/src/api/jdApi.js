/**
 * JD API — Phase 1
 * Wraps /api/jds endpoints.
 */
import api from '../services/api';

/** POST /api/jds — persist + analyze a job description */
export const createJD = (data) => api.post('/jds', data);

/** GET /api/jds — list current user's JDs */
export const listJDs = () => api.get('/jds');

/** GET /api/jds/:id — fetch a single JD */
export const getJD = (id) => api.get(`/jds/${id}`);
