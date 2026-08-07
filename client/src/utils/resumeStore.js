/**
 * Resume Store
 *
 * Five pages (Dashboard, JD viewer, AI Suggestions, Career Assistant, Privacy
 * Dashboard) read the user's resume list from a localStorage key. Nothing ever
 * wrote that key, so every one of those pickers was permanently empty.
 *
 * This module is the single place that maintains it: `syncResumes()` fetches
 * from the server (source of truth) and caches, `addCachedResume()` keeps the
 * cache warm right after an upload.
 *
 * Readers disagree on the id field — most use `resumeId`, PrivacyDashboardPage
 * uses `_id` — so every cached entry carries both.
 */
import { listResumes } from '../services/api';

const STORAGE_KEY = 'resumes';

/** Normalize a server resume (or an upload response) into the cached shape. */
function normalize(resume) {
  const id = resume._id ?? resume.resumeId;
  return {
    _id: id,
    resumeId: id,
    fileName: resume.originalFileName ?? resume.fileName ?? 'Resume',
    atsScore: resume.atsScore ?? null,
  };
}

export function getCachedResumes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

/**
 * Fetch the resume list from the server and refresh the cache.
 * Falls back to whatever is cached if the request fails, so a flaky network
 * degrades to stale data rather than an empty picker.
 */
export async function syncResumes() {
  try {
    const res = await listResumes();
    const resumes = res.data?.data?.resumes ?? [];
    return write(resumes.map(normalize));
  } catch {
    return getCachedResumes();
  }
}

/** Add (or refresh) one resume at the front of the cache. */
export function addCachedResume(resume) {
  const entry = normalize(resume);
  if (!entry.resumeId) return getCachedResumes();
  const rest = getCachedResumes().filter((r) => r.resumeId !== entry.resumeId);
  return write([entry, ...rest]);
}

export function clearCachedResumes() {
  localStorage.removeItem(STORAGE_KEY);
}
