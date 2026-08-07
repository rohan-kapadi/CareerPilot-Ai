/**
 * Memory API — Phase 3
 */
import api from '../services/api';

/** GET /api/memory — list memories (filterable) */
export const listMemories = (params = {}) => api.get('/memory', { params });

/** GET /api/memory/proposed — pending Memory Cards awaiting decision */
export const getProposed = (conversationId) =>
  api.get('/memory/proposed', conversationId ? { params: { conversationId } } : {});

/** POST /api/memory/:id/decision — accept|modify|reject|timebox */
export const decideMemory = (id, payload) => api.post(`/memory/${id}/decision`, payload);

/** GET /api/memory/:id/usage — "Used In" transparency panel */
export const getMemoryUsage = (id) => api.get(`/memory/${id}/usage`);

/** POST /api/memory/:id/forget?preview=true — impact preview or soft-delete */
export const forgetMemory = (id, preview = false) =>
  api.post(`/memory/${id}/forget${preview ? '?preview=true' : ''}`);
