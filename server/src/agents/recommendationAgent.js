/**
 * Recommendation Agent — Phase 6
 *
 * Generates two kinds of proposals, both as `Suggestion` documents:
 *   1. Resume Optimizer edits  (PROJECT.md §6.5)
 *   2. Learning Roadmap items  (PROJECT.md §6.7)
 *
 * INVARIANT: every document created here starts at status: 'pending'.
 * This agent NEVER writes to Resume.sections — only suggestionController
 * may do that, and only on explicit user approval.
 *
 * Course links come from python-service/routers/course_recommender.py
 * (AdaptIQ's TF-IDF recommender, ported in Phase 2). Do not reimplement
 * TF-IDF matching here (phases-1.md §2 handoff).
 */
const Suggestion = require('../models/Suggestion');
const Resume = require('../models/Resume.model');
const JobDescription = require('../models/JobDescription');
const Memory = require('../models/Memory');
const MemoryUsageLog = require('../models/MemoryUsageLog');
const { callMistralJSON } = require('../services/llmService');
const { fetchCourseRecommendations } = require('../services/pythonBridge.service');
const { evaluate } = require('./evaluatorAgent');
const { review } = require('./criticAgent');
const { getByPath, isAllowedPath, deepEqual } = require('../utils/sectionDiff');

/** Text leaves an optimizer edit is allowed to rewrite. */
const EDITABLE_LEAF_ROOTS = ['summary', 'experience', 'projects'];

/**
 * Flatten a sections object into a list of { path, value } for text leaves,
 * so the LLM can only propose edits against paths that actually exist.
 */
function buildPathMap(sections = {}, limit = 40) {
  const entries = [];

  if (typeof sections.summary === 'string' && sections.summary.trim()) {
    entries.push({ path: 'summary', value: sections.summary });
  }

  (sections.experience || []).forEach((exp, i) => {
    (exp.bullets || []).forEach((bullet, j) => {
      if (typeof bullet === 'string' && bullet.trim()) {
        entries.push({ path: `experience.${i}.bullets.${j}`, value: bullet });
      }
    });
  });

  (sections.projects || []).forEach((project, i) => {
    if (typeof project.description === 'string' && project.description.trim()) {
      entries.push({ path: `projects.${i}.description`, value: project.description });
    }
  });

  return entries.slice(0, limit);
}

/**
 * Wrap raw agent output in a Phase 4 explanation trace.
 * Always evaluator → critic, per the Phase 4 handoff.
 */
async function buildTrace(rawOutput, context) {
  try {
    const evaluated = await evaluate(rawOutput, 'recommendation', context);
    return await review(evaluated, context);
  } catch (err) {
    console.error('recommendationAgent trace error:', err.message);
    return {
      reasoning: [
        {
          factor: 'Recommendation relevance',
          weight: 1,
          score: 0.7,
          evidence: 'Derived from the resume and job description supplied.',
        },
      ],
      confidence: 0.7,
      alternatives: ['Review this suggestion against your own experience before approving.'],
      sources: ['resume.sections'],
      criticReviewed: false,
      criticFlagsCount: 0,
    };
  }
}

/**
 * Load accepted, unexpired memories to personalise recommendations.
 * Read-only — usage is logged separately once we know which Suggestion used them.
 */
async function loadMemoryContext(userId, limit = 10) {
  const accepted = await Memory.find({
    userId,
    status: { $in: ['accepted', 'modified'] },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .sort({ confidence: -1, updatedAt: -1 })
    .limit(limit)
    .lean();

  return {
    strings: accepted.map((m) => `• [${m.category}] ${m.userModifiedContent || m.content}`),
    ids: accepted.map((m) => m._id),
  };
}

/**
 * Record that these memories shaped a specific Suggestion ("Used In" panel, §7.4).
 */
async function logMemoryUsage(userId, memoryIds, suggestionId, label) {
  if (!memoryIds?.length) return;
  await Promise.all(
    memoryIds.map((memoryId) =>
      MemoryUsageLog.create({
        memoryId,
        userId,
        usedInType: 'recommendation',
        usedInRef: suggestionId,
        usedInLabel: label,
      }).catch(() => null)
    )
  );
}

/**
 * Skip a proposal if an identical one is already waiting for the user.
 * Prevents the review queue filling with duplicates on repeat runs.
 */
async function isDuplicate(userId, resumeId, diff) {
  const existing = await Suggestion.findOne({
    userId,
    resumeId,
    status: 'pending',
    'diff.path': diff.path,
  }).lean();
  return Boolean(existing) && deepEqual(existing.diff?.after, diff.after);
}

/**
 * Generate approval-gated Optimizer edits for a resume.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.resumeId
 * @param {string} [params.jdId]    - target JD, sharpens the suggestions
 * @param {string} [params.matchId] - originating match, for traceability
 * @param {number} [params.limit]   - max suggestions to create
 * @returns {Promise<Array>} created Suggestion documents (all status 'pending')
 */
async function generateOptimizerSuggestions({ userId, resumeId, jdId = null, matchId = null, limit = 6 }) {
  const resume = await Resume.findOne({ _id: resumeId, userId }).lean();
  if (!resume) throw new Error('Resume not found');

  const jd = jdId ? await JobDescription.findOne({ _id: jdId, userId }).lean() : null;
  const pathMap = buildPathMap(resume.sections);
  const memoryContext = await loadMemoryContext(userId);

  const missingSkills = jd?.extracted?.skillsToImprove || resume.missingSkills || [];

  const systemPrompt = `You are the Recommendation Agent for CareerPilot AI.
You propose specific, approvable resume improvements. You never rewrite the whole resume.

Return JSON exactly matching:
{
  "suggestions": [
    {
      "suggestionType": "edit" | "skill_add",
      "title": "Short imperative headline (max 90 chars)",
      "path": "One of the EXACT paths listed below, or 'skills' for skill_add",
      "op": "replace" | "add",
      "after": "For edit: the full rewritten text. For skill_add: an array of skill strings.",
      "rationale": "Why this raises the match/ATS score, in one sentence",
      "evidence": "The specific JD requirement or resume weakness this addresses"
    }
  ]
}

Hard rules:
- For "edit", "path" MUST be copied verbatim from the AVAILABLE PATHS list. Never invent a path.
- For "edit", "op" is always "replace" and "after" is a single rewritten string that preserves the user's voice and facts. Never fabricate employers, metrics, dates or titles that are not already present.
- For "skill_add", "path" is exactly "skills", "op" is "add", and "after" is an array of skill strings the candidate plausibly already has based on their resume.
- Propose at most ${limit} suggestions, highest impact first.`;

  const userPrompt = `AVAILABLE PATHS (copy verbatim):
${pathMap.map((entry) => `${entry.path}: ${JSON.stringify(String(entry.value).slice(0, 220))}`).join('\n') || '(none)'}

CURRENT SKILLS: ${JSON.stringify(resume.sections?.skills || [])}

TARGET JOB: ${jd ? `${jd.title || 'Untitled'} at ${jd.company || 'Unknown'}` : 'No specific job selected'}
JOB REQUIREMENTS: ${JSON.stringify((jd?.extracted?.skillsRequiredInJob || []).slice(0, 30))}
IDENTIFIED SKILL GAPS: ${JSON.stringify(missingSkills.slice(0, 20))}
${jd?.rawText ? `JOB DESCRIPTION EXCERPT: ${jd.rawText.slice(0, 1200)}` : ''}

${memoryContext.strings.length ? `WHAT THE USER HAS APPROVED YOU REMEMBERING:\n${memoryContext.strings.join('\n')}` : ''}`;

  let raw;
  try {
    raw = await callMistralJSON(systemPrompt, userPrompt);
  } catch (err) {
    console.error('recommendationAgent LLM error:', err.message);
    throw new Error('Could not generate suggestions right now. Please try again.');
  }

  const proposals = Array.isArray(raw?.suggestions) ? raw.suggestions.slice(0, limit) : [];
  const created = [];

  for (const proposal of proposals) {
    const suggestionType = proposal.suggestionType === 'skill_add' ? 'skill_add' : 'edit';
    const path = suggestionType === 'skill_add' ? 'skills' : proposal.path;

    if (!isAllowedPath(path)) continue;

    // An edit must target existing text; a skill_add must carry real skills.
    let after = proposal.after;
    let before;

    if (suggestionType === 'skill_add') {
      const additions = (Array.isArray(after) ? after : [after])
        .filter((s) => typeof s === 'string' && s.trim())
        .map((s) => s.trim());
      const currentSkills = resume.sections?.skills || [];
      const novel = additions.filter(
        (s) => !currentSkills.some((existing) => existing.toLowerCase() === s.toLowerCase())
      );
      if (!novel.length) continue;
      after = novel;
      before = currentSkills;
    } else {
      if (!EDITABLE_LEAF_ROOTS.includes(path.split('.')[0])) continue;
      before = getByPath(resume.sections, path);
      if (typeof before !== 'string' || !before.trim()) continue;
      if (typeof after !== 'string' || !after.trim()) continue;
      if (after.trim() === before.trim()) continue;
      after = after.trim();
    }

    const diff = {
      path,
      op: suggestionType === 'skill_add' ? 'add' : 'replace',
      before,
      after,
    };

    if (await isDuplicate(userId, resumeId, diff)) continue;

    const explanationTrace = await buildTrace(
      {
        output: proposal.title || 'Resume improvement',
        rationale: proposal.rationale,
        evidence: proposal.evidence,
        before,
        after,
      },
      {
        resumeText: JSON.stringify(resume.sections).slice(0, 4000),
        jdText: (jd?.rawText || '').slice(0, 4000),
      }
    );

    const suggestion = await Suggestion.create({
      userId,
      resumeId,
      suggestionType,
      title: (proposal.title || 'Suggested resume improvement').slice(0, 160),
      diff,
      explanationTrace,
      sourceRef: {
        matchId: matchId || null,
        jdId: jdId || null,
        skillGap: suggestionType === 'skill_add' ? after.join(', ') : '',
      },
      status: 'pending', // ← INVARIANT: always 'pending' at creation
    });

    await logMemoryUsage(userId, memoryContext.ids, suggestion._id, suggestion.title);
    created.push(suggestion);
  }

  return created;
}

/**
 * Generate a Learning Roadmap for one or more skill gaps.
 * Each skill becomes one pending 'roadmap' Suggestion with ordered milestones
 * plus course links from the ported TF-IDF recommender.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string[]} params.skills - the skill gaps to build roadmaps for
 * @param {string} [params.jdId]   - originating JD (the "skill gap id")
 * @param {string} [params.resumeId]
 * @returns {Promise<Array>} created Suggestion documents (all status 'pending')
 */
async function generateRoadmap({ userId, skills = [], jdId = null, resumeId = null }) {
  const targetSkills = skills
    .filter((s) => typeof s === 'string' && s.trim())
    .map((s) => s.trim())
    .slice(0, 8);

  if (!targetSkills.length) return [];

  const memoryContext = await loadMemoryContext(userId);

  const systemPrompt = `You are the Recommendation Agent for CareerPilot AI, building a Learning Roadmap.

Return JSON exactly matching:
{
  "roadmaps": [
    {
      "skill": "The skill name, copied verbatim from the requested list",
      "prerequisites": ["Skills from the requested list that should be learned BEFORE this one"],
      "milestones": [
        { "order": 1, "title": "Milestone title", "description": "What the learner does", "estimatedWeeks": 2 }
      ]
    }
  ]
}

Rules:
- One roadmap per requested skill, in a sensible learning order.
- 3 to 5 milestones per skill, ordered from fundamentals to applied project work.
- "prerequisites" may only reference skills from the requested list; use [] when there are none.
- estimatedWeeks is a realistic integer between 1 and 8.`;

  const userPrompt = `REQUESTED SKILL GAPS: ${JSON.stringify(targetSkills)}

${memoryContext.strings.length ? `WHAT THE USER HAS APPROVED YOU REMEMBERING (tailor pacing and depth to this):\n${memoryContext.strings.join('\n')}` : ''}`;

  let raw;
  try {
    raw = await callMistralJSON(systemPrompt, userPrompt);
  } catch (err) {
    console.error('recommendationAgent roadmap LLM error:', err.message);
    throw new Error('Could not generate a roadmap right now. Please try again.');
  }

  const roadmaps = Array.isArray(raw?.roadmaps) ? raw.roadmaps : [];
  const created = [];

  for (const skill of targetSkills) {
    const plan =
      roadmaps.find((r) => String(r.skill || '').toLowerCase() === skill.toLowerCase()) || {};

    const milestones = (Array.isArray(plan.milestones) ? plan.milestones : [])
      .slice(0, 6)
      .map((m, index) => ({
        order: Number.isFinite(m.order) ? m.order : index + 1,
        title: String(m.title || `Step ${index + 1}`).slice(0, 160),
        description: String(m.description || '').slice(0, 600),
        estimatedWeeks: Math.min(Math.max(Number(m.estimatedWeeks) || 1, 1), 8),
      }))
      .sort((a, b) => a.order - b.order);

    if (!milestones.length) continue;

    // Course links from the ported AdaptIQ TF-IDF recommender — best effort.
    let courses = [];
    try {
      const recommendations = await fetchCourseRecommendations(skill, 3);
      courses = recommendations.map((c) => ({
        title: c.title || '',
        url: c.url || '',
        platform: 'Udemy',
        score: typeof c.similarity_score === 'number' ? c.similarity_score : 0,
      }));
    } catch (err) {
      console.error(`Course recommendation failed for "${skill}":`, err.message);
    }

    const prerequisites = (Array.isArray(plan.prerequisites) ? plan.prerequisites : []).filter(
      (p) =>
        typeof p === 'string' &&
        p.toLowerCase() !== skill.toLowerCase() &&
        targetSkills.some((s) => s.toLowerCase() === p.toLowerCase())
    );

    // One pending roadmap per skill gap — replace any earlier pending one
    await Suggestion.deleteMany({
      userId,
      suggestionType: 'roadmap',
      status: 'pending',
      'roadmap.skill': skill,
      'sourceRef.jdId': jdId || null,
    });

    const explanationTrace = await buildTrace(
      {
        output: `Learning roadmap for ${skill}`,
        milestones: milestones.map((m) => m.title),
        courses: courses.map((c) => c.title),
      },
      { resumeText: '', jdText: skill }
    );

    const suggestion = await Suggestion.create({
      userId,
      resumeId: resumeId || null,
      suggestionType: 'roadmap',
      title: `Learning roadmap: ${skill}`.slice(0, 160),
      diff: { path: '', op: 'replace', before: null, after: null }, // roadmaps change no resume text
      explanationTrace,
      roadmap: { skill, prerequisites, milestones, courses },
      sourceRef: { jdId: jdId || null, skillGap: skill },
      status: 'pending', // ← INVARIANT: always 'pending' at creation
    });

    await logMemoryUsage(userId, memoryContext.ids, suggestion._id, suggestion.title);
    created.push(suggestion);
  }

  return created;
}

module.exports = { generateOptimizerSuggestions, generateRoadmap };
