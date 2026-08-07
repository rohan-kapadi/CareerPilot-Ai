/**
 * Section Diff Utilities — Phase 6 / Phase 7
 *
 * Pure functions for reading, writing, applying and comparing changes against
 * a `Resume.sections` document. Deliberately free of Mongoose and LLM calls so
 * both the approval workflow (Phase 6) and version comparison (Phase 7) can
 * share one implementation.
 *
 * Path syntax is dot-notation with numeric array indices:
 *   'summary'
 *   'skills'
 *   'experience.0.bullets.2'
 *   'personalInfo.linkedin'
 */

/** Keys that are Mongo bookkeeping, never meaningful in a user-facing diff. */
const SKIP_KEYS = new Set(['_id', '__v']);

/** Top-level section names a Suggestion is allowed to touch. */
const ALLOWED_ROOTS = new Set([
  'personalInfo',
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function deepEqual(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Treat undefined, null and '' as the same "absent" value to keep diffs quiet. */
function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function valuesEqual(a, b) {
  if (isEmpty(a) && isEmpty(b)) return true;
  return deepEqual(a, b);
}

function isPrimitive(value) {
  return value === null || value === undefined || typeof value !== 'object';
}

/**
 * Read a value out of an object by dot-path. Returns undefined if any hop is missing.
 */
function getByPath(root, path) {
  if (!path) return undefined;
  let current = root;
  for (const part of String(path).split('.')) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Write a value into an object by dot-path, creating intermediate
 * objects/arrays as needed. Mutates `root` — callers pass a clone.
 */
function setByPath(root, path, value) {
  const parts = String(path).split('.');
  let current = root;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (current[key] === null || current[key] === undefined) {
      // Next segment tells us whether this hop should be an array or an object
      current[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    current = current[key];
  }

  current[parts[parts.length - 1]] = value;
  return root;
}

/**
 * Is this path safe for a Suggestion to modify?
 * Guards against an LLM emitting paths like 'atsScore' or '__proto__'.
 */
function isAllowedPath(path) {
  if (!path || typeof path !== 'string') return false;
  const parts = path.split('.');
  if (!ALLOWED_ROOTS.has(parts[0])) return false;
  return parts.every(
    (part) => part.length > 0 && !['__proto__', 'constructor', 'prototype'].includes(part)
  );
}

/**
 * Apply a single Suggestion diff to a sections object.
 * Never mutates the input — returns a new sections object.
 *
 * @param {object} sections - Resume.sections (plain object or Mongoose doc)
 * @param {{ path: string, op?: 'replace'|'add'|'remove', before?: *, after?: * }} diff
 * @returns {object} the resulting sections
 */
function applyDiff(sections, diff) {
  const next = deepClone(sections);
  if (!diff || !isAllowedPath(diff.path)) return next;

  const { path, op = 'replace', before, after } = diff;
  const current = getByPath(next, path);

  if (op === 'add') {
    if (Array.isArray(current)) {
      const additions = Array.isArray(after) ? after : [after];
      const merged = [...current];
      additions.forEach((item) => {
        if (item !== null && item !== undefined && !merged.some((x) => deepEqual(x, item))) {
          merged.push(item);
        }
      });
      setByPath(next, path, merged);
    } else {
      setByPath(next, path, after);
    }
    return next;
  }

  if (op === 'remove') {
    if (Array.isArray(current)) {
      const removals = Array.isArray(before) ? before : [before];
      setByPath(
        next,
        path,
        current.filter((x) => !removals.some((r) => deepEqual(x, r)))
      );
    } else {
      setByPath(next, path, '');
    }
    return next;
  }

  // Default: replace
  setByPath(next, path, after);
  return next;
}

/**
 * Recursively compare two sections objects.
 *
 * @returns {Array<{ path: string, before: *, after: *, type: 'added'|'removed'|'changed' }>}
 */
function computeDiff(before, after) {
  const changes = [];
  walk(before, after, '', changes);
  return changes;
}

function changeType(a, b) {
  if (isEmpty(a)) return 'added';
  if (isEmpty(b)) return 'removed';
  return 'changed';
}

function walk(a, b, path, changes) {
  if (valuesEqual(a, b)) return;

  // A primitive on either side means the whole subtree at this path changed
  if (isPrimitive(a) || isPrimitive(b)) {
    changes.push({
      path,
      before: a ?? null,
      after: b ?? null,
      type: changeType(a, b),
    });
    return;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    const arrA = Array.isArray(a) ? a : [];
    const arrB = Array.isArray(b) ? b : [];
    const length = Math.max(arrA.length, arrB.length);
    for (let i = 0; i < length; i += 1) {
      walk(arrA[i], arrB[i], path ? `${path}.${i}` : String(i), changes);
    }
    return;
  }

  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of keys) {
    if (SKIP_KEYS.has(key)) continue;
    walk(a?.[key], b?.[key], path ? `${path}.${key}` : key, changes);
  }
}

/**
 * Human-readable one-liner for a change set.
 * Used as ResumeVersion.diffSummary (Phase 7) and on approval toasts.
 */
function summarizeDiff(changes = []) {
  if (!changes.length) return 'No changes';

  const bySection = {};
  changes.forEach((change) => {
    const root = change.path.split('.')[0] || 'resume';
    bySection[root] = (bySection[root] || 0) + 1;
  });

  const parts = Object.entries(bySection).map(([section, count]) => `${section} (${count})`);
  return `${changes.length} change${changes.length !== 1 ? 's' : ''} — ${parts.join(', ')}`;
}

/**
 * Short label describing a single diff, for the Suggestion card header.
 */
function describeDiff(diff) {
  if (!diff?.path) return 'Resume change';
  const op = diff.op || 'replace';
  const verb = op === 'add' ? 'Add to' : op === 'remove' ? 'Remove from' : 'Rewrite';
  return `${verb} ${diff.path}`;
}

module.exports = {
  ALLOWED_ROOTS,
  deepClone,
  deepEqual,
  getByPath,
  setByPath,
  isAllowedPath,
  applyDiff,
  computeDiff,
  summarizeDiff,
  describeDiff,
};
