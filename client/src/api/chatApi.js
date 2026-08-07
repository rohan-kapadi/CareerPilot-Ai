/**
 * Chat API — Phase 2
 * Wraps /api/chat endpoints.
 */
import api from '../services/api';

/** POST /api/chat — send a message, get AI reply */
export const sendMessage = (data) => api.post('/chat', data);

/** GET /api/chat/:id — fetch full conversation with turns */
export const getConversation = (id) => api.get(`/chat/${id}`);

/** GET /api/chat — list all conversations */
export const listConversations = () => api.get('/chat');
