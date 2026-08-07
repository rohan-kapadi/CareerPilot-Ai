/**
 * Resume Builder Agent — Phase 2
 *
 * Conversational, one-section-at-a-time resume drafter.
 * No direct equivalent in either RoleReady or AdaptIQ — this is new.
 *
 * Flow:
 *   1. chatController calls draftSection() with the target section + user's raw input
 *   2. Agent drafts structured content for that section
 *   3. Returns { draft, nextQuestion, sectionComplete } so the UI can show accept/edit/skip
 *   4. On accept, chatController calls PUT /api/resume/:id/sections with the accepted draft
 *
 * Section order: summary → experience → education → skills → projects
 *
 * Phase 6 Context Handoff:
 *   Currently "accept" writes directly to Resume.sections. Phase 6 will route this
 *   through a Suggestion model for Human Approval Workflow. Do NOT build competing
 *   approval mechanisms in Phase 3/4/5.
 */
const { callMistralJSON } = require('../services/llmService');

const SECTION_ORDER = ['summary', 'experience', 'education', 'skills', 'projects'];

const SECTION_PROMPTS = {
  summary: {
    system: `You are an expert resume writer. Draft a compelling professional summary for a resume based on the user's input. Keep it 2-4 sentences, ATS-friendly, achievement-focused.`,
    schema: `{ "summary": "string", "nextQuestion": "Ask for years of experience and top achievements to refine this further", "sectionComplete": false }`,
    userTemplate: (input, currentContent, userContext) => `
User input: "${input}"
Current summary (if any): "${currentContent?.summary || ''}"
User skills: ${(userContext.skills || []).slice(0, 10).join(', ')}
User experience: ${(userContext.experience || []).slice(0, 2).map(e => `${e.role} at ${e.company}`).join('; ')}
Persona: ${userContext.personaType || 'professional'}

Draft a professional summary. Return JSON: { "summary": "...", "nextQuestion": "...", "sectionComplete": boolean }
sectionComplete = true only if you have enough info for a strong final draft.`,
  },

  experience: {
    system: `You are an expert resume writer specializing in experience bullet points. Use STAR method, strong action verbs, quantify achievements. Never fabricate — use [X%] or [N users] placeholders when metrics unknown.`,
    schema: `{ "experience": [{ "company": "", "role": "", "duration": "", "bullets": [] }], "nextQuestion": "...", "sectionComplete": false }`,
    userTemplate: (input, currentContent, userContext) => `
User input: "${input}"
Current experience (if any): ${JSON.stringify((currentContent?.experience || []).slice(0, 3))}
User persona: ${userContext.personaType || 'professional'}

Draft or improve experience entries. Return JSON:
{ "experience": [{ "company": "", "role": "", "duration": "", "bullets": ["...", "..."] }], "nextQuestion": "...", "sectionComplete": boolean }
sectionComplete = true if you have at least 1 well-formed entry with 3+ bullets.`,
  },

  education: {
    system: `You are a resume writer. Format education entries clearly and completely.`,
    schema: `{ "education": [{ "institution": "", "degree": "", "year": "", "gpa": "" }], "nextQuestion": "...", "sectionComplete": false }`,
    userTemplate: (input, currentContent) => `
User input: "${input}"
Current education (if any): ${JSON.stringify(currentContent?.education || [])}

Draft education entries. Return JSON:
{ "education": [{ "institution": "", "degree": "", "year": "", "gpa": "" }], "nextQuestion": "...", "sectionComplete": boolean }
sectionComplete = true if you have at least 1 complete entry.`,
  },

  skills: {
    system: `You are a resume writer. Curate a clean, ATS-optimized skills list. Group by category if >10 skills. Prefer specific tools over generic terms.`,
    schema: `{ "skills": [], "nextQuestion": "...", "sectionComplete": false }`,
    userTemplate: (input, currentContent, userContext) => `
User input: "${input}"
Current skills (if any): ${JSON.stringify(currentContent?.skills || [])}
Profile skills: ${(userContext.skills || []).join(', ')}

Return a curated, deduplicated skills list. Return JSON:
{ "skills": ["skill1", "skill2", ...], "nextQuestion": "...", "sectionComplete": boolean }
sectionComplete = true if skills list has 5+ items.`,
  },

  projects: {
    system: `You are a resume writer. Draft project entries with clear names, concise descriptions, and tech stacks. Emphasize impact.`,
    schema: `{ "projects": [{ "name": "", "description": "", "techStack": [], "link": "" }], "nextQuestion": "...", "sectionComplete": false }`,
    userTemplate: (input, currentContent) => `
User input: "${input}"
Current projects (if any): ${JSON.stringify((currentContent?.projects || []).slice(0, 3))}

Draft project entries. Return JSON:
{ "projects": [{ "name": "", "description": "", "techStack": [], "link": "" }], "nextQuestion": "...", "sectionComplete": boolean }
sectionComplete = true if you have at least 1 project with name + description + techStack.`,
  },
};

/**
 * Draft a single resume section based on user input.
 *
 * @param {string} section - One of: summary | experience | education | skills | projects
 * @param {string} userInput - Raw user message
 * @param {object} currentSections - Current resume.sections (for context)
 * @param {object} userContext - { personaType, skills, experience, name }
 * @returns {Promise<{
 *   section: string,
 *   draft: object,        // The drafted content for this section
 *   nextQuestion: string, // Follow-up question to refine the draft
 *   sectionComplete: boolean,
 *   nextSection: string|null,  // Next section in the sequence, or null if done
 * }>}
 */
async function draftSection(section, userInput, currentSections = {}, userContext = {}) {
  if (!SECTION_ORDER.includes(section)) {
    throw new Error(`Unknown section: ${section}. Valid: ${SECTION_ORDER.join(', ')}`);
  }

  const { system, userTemplate } = SECTION_PROMPTS[section];
  const userPrompt = userTemplate(userInput, currentSections, userContext);

  const result = await callMistralJSON(system, userPrompt);

  const currentIdx = SECTION_ORDER.indexOf(section);
  const nextSection = result.sectionComplete
    ? SECTION_ORDER[currentIdx + 1] ?? null
    : null;

  // Extract the section-specific draft (strip non-draft keys)
  const { nextQuestion, sectionComplete, ...draft } = result;

  return {
    section,
    draft,
    nextQuestion: nextQuestion || `Anything else to add to your ${section}?`,
    sectionComplete: !!sectionComplete,
    nextSection,
  };
}

/**
 * Get the initial prompt question for a given section.
 * Used by chatController to start a builder conversation.
 */
function getOpeningQuestion(section) {
  const questions = {
    summary:    "Let's start with your professional summary. Tell me about yourself — your current role, top skills, and what kind of opportunities you're targeting.",
    experience: "Great! Now let's work on your experience section. Tell me about your most recent or most relevant job — company, role, and what you worked on.",
    education:  "Let's add your education. What degree did you study, from which institution, and when did you graduate?",
    skills:     "Time for your skills section. What are your top technical and professional skills? Don't worry about formatting — just list them out.",
    projects:   "Finally, let's add any projects. Describe a project you're proud of — what it does, the tech you used, and any results or links.",
  };
  return questions[section] || `Tell me about your ${section}.`;
}

module.exports = { draftSection, getOpeningQuestion, SECTION_ORDER };
