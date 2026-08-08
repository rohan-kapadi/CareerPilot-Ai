/**
 * Version & Export API — Phase 7
 * Wraps the version history, comparison and export endpoints on /api/resume.
 */
import api from '../services/api';

/** GET /api/resume/:id/versions — timeline metadata (no snapshots) */
export const listVersions = (resumeId) => api.get(`/resume/${resumeId}/versions`);

/** POST /api/resume/:id/versions/:version/restore — append-only rollback */
export const restoreVersion = (resumeId, versionNumber) =>
  api.post(`/resume/${resumeId}/versions/${versionNumber}/restore`);

/** GET /api/resume/:id/compare?v1=&v2= — server-computed structured diff */
export const compareVersions = (resumeId, v1, v2) =>
  api.get(`/resume/${resumeId}/compare`, { params: { v1, v2 } });

/** GET /api/resume/:id/export-options — templates + detected PII flags */
export const getExportOptions = (resumeId) => api.get(`/resume/${resumeId}/export-options`);

/** POST /api/resume/:id/export with preview:true — redacted content, no file */
export const previewExport = (resumeId, redactFieldPaths = []) =>
  api.post(`/resume/${resumeId}/export`, { preview: true, redactFieldPaths });

/**
 * POST /api/resume/:id/export — returns the generated file as a blob.
 * AI-free by design: this is the one artifact that leaves the system.
 */
export const exportResume = (resumeId, { format = 'pdf', template = 'modern', redactFieldPaths = [] } = {}) =>
  api.post(
    `/resume/${resumeId}/export`,
    { format, template, redactFieldPaths },
    { responseType: 'blob' }
  );

/** POST /api/export/:id/email — emails the generated PDF and DOCX to the user */
export const exportEmail = (resumeId) => api.post(`/export/${resumeId}/email`);

/** Trigger a browser download for a blob response. */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
