/**
 * Redacts specified field paths from a resume document.
 * This does NOT mutate the original object, it returns a deep copy with fields redacted.
 *
 * @param {object} resume - The original resume document (Mongoose doc or plain object)
 * @param {Array<string>} fieldPaths - Array of JSON paths to redact, e.g. ['personalInfo.dob', 'summary']
 * @returns {object} - A deep copy of the resume with fields replaced by '[REDACTED]'
 */
function redactResume(resume, fieldPaths = []) {
  // Deep copy to ensure we don't mutate the original DB object
  const redactedCopy = JSON.parse(JSON.stringify(resume));

  for (const path of fieldPaths) {
    const parts = path.split('.');
    let current = redactedCopy.sections;
    
    // Fallback if path doesn't start with sections but exists at root (rare, but handle safely)
    if (!current) {
        current = redactedCopy;
    }

    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]]) {
        current = current[parts[i]];
      } else {
        current = null;
        break;
      }
    }

    if (current && typeof current === 'object' && parts.length > 0) {
      const finalKey = parts[parts.length - 1];
      if (current[finalKey] !== undefined) {
        if (typeof current[finalKey] === 'string') {
          current[finalKey] = '[REDACTED]';
        } else if (Array.isArray(current[finalKey])) {
           current[finalKey] = []; // Empty array for arrays
        } else {
           current[finalKey] = null; // null for other objects
        }
      }
    }
  }

  return redactedCopy;
}

module.exports = { redactResume };
