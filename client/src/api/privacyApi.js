import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

export const privacyApi = {
  getFlags: async (resumeId) => {
    const response = await api.get(`/privacy/flags/${resumeId}`);
    return response.data;
  },
  
  scanResume: async (resumeId) => {
    const response = await api.post('/privacy/scan', { resumeId });
    return response.data;
  },

  redactResume: async (resumeId, fieldPaths) => {
    const response = await api.post('/privacy/redact', { resumeId, fieldPaths });
    return response.data;
  },

  getConsents: async () => {
    const response = await api.get('/privacy/consent');
    return response.data;
  },

  updateConsent: async (purpose, dataCategory, granted) => {
    const response = await api.post('/privacy/consent', { purpose, dataCategory, granted });
    return response.data;
  },

  exportData: async (category) => {
    const response = await api.get(`/privacy/export?category=${category}`);
    return response.data;
  },

  deleteDataCategory: async (category) => {
    const response = await api.delete(`/privacy/data/${category}`);
    return response.data;
  }
};
