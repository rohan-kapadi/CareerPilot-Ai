const PrivacyFlag = require('../models/PrivacyFlag');
const Consent = require('../models/Consent');
const { detectPII } = require('../services/piiDetectionService');

/**
 * Scans a resume for PII and saves PrivacyFlag records.
 * @param {string} resumeId
 * @param {object} resumeData
 * @returns {Promise<Array<object>>} - Newly created or existing flags
 */
async function scanAndFlagResume(resumeId, resumeData) {
  const detected = await detectPII(resumeData);
  const flags = [];

  for (const item of detected) {
    try {
      // Upsert the flag so we don't create duplicates
      const flag = await PrivacyFlag.findOneAndUpdate(
        { resumeId, fieldPath: item.fieldPath },
        { flagType: item.flagType },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      flags.push(flag);
    } catch (error) {
      console.error(`Failed to upsert privacy flag for ${item.fieldPath}:`, error);
    }
  }

  return flags;
}

/**
 * Checks if a user has granted consent for a specific purpose and data category.
 * @param {string} userId
 * @param {string} purpose - e.g., 'chat_memory'
 * @param {string} dataCategory - e.g., 'sensitive_memory'
 * @returns {Promise<boolean>}
 */
async function hasConsent(userId, purpose, dataCategory) {
  const consent = await Consent.findOne({ userId, purpose, dataCategory });
  return consent ? consent.granted : false;
}

/**
 * Enforces consent. Throws an error if consent is missing.
 */
async function requireConsent(userId, purpose, dataCategory) {
  const granted = await hasConsent(userId, purpose, dataCategory);
  if (!granted) {
    throw new Error(`Privacy Agent Blocked Action: Consent not granted for purpose '${purpose}' on category '${dataCategory}'.`);
  }
}

module.exports = {
  scanAndFlagResume,
  hasConsent,
  requireConsent
};
