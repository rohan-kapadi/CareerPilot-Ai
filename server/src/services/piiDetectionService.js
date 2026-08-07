const { callMistralJSON } = require('./llmService');

const SYSTEM_PROMPT = `You are a Privacy System Agent.
Your job is to scan resume data and detect any Personally Identifiable Information (PII) or sensitive fields that should typically NOT be on a modern professional resume (e.g., Date of Birth, Age, Marital Status, Nationality, Religion, Photo/Image URLs).
Return a JSON array of objects representing the detected PII.
Format:
{
  "detectedPII": [
    {
      "fieldPath": "string (the exact JSON path where the data was found, e.g., 'personalInfo.dob' or 'summary')",
      "flagType": "string (e.g., 'DOB', 'MaritalStatus', 'Nationality', 'Religion', 'Photo')"
    }
  ]
}
If no PII is detected, return an empty array. Do not flag standard professional info like Name, Email, Phone, Address, LinkedIn, or GitHub.
`;

/**
 * Scans a resume for sensitive PII.
 * @param {object} resume - The full resume document
 * @returns {Promise<Array<{fieldPath: string, flagType: string}>>}
 */
async function detectPII(resume) {
  if (!resume || !resume.sections) return [];

  // We primarily care about personalInfo and summary where these typically leak
  const dataToScan = {
    personalInfo: resume.sections.personalInfo,
    summary: resume.sections.summary
  };

  const userPrompt = `Scan the following resume data for sensitive PII:\n\n${JSON.stringify(dataToScan, null, 2)}`;

  try {
    const result = await callMistralJSON(SYSTEM_PROMPT, userPrompt);
    return result.detectedPII || [];
  } catch (error) {
    console.error('Error detecting PII:', error);
    return []; // Fail open: if detection fails, return no flags
  }
}

module.exports = { detectPII };
