/**
 * Seed Script — Phase 8
 *
 * Populates a realistic demo account so the Section 21 demo flow runs without
 * manual DB work: a parsed resume, a target JD with real skill gaps, a scored
 * match with an explanation trace, negotiated memories in every state, privacy
 * flags, pending suggestions, a learning roadmap, and version history.
 *
 * Run:  npm run seed        (add --force to wipe an existing demo account)
 *
 * Only ever touches the demo user's own documents. It will refuse to run
 * against a non-empty demo account unless --force is passed.
 */
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');

const User = require('../models/User.model');
const Resume = require('../models/Resume.model');
const ResumeVersion = require('../models/ResumeVersion');
const JobDescription = require('../models/JobDescription');
const Match = require('../models/Match');
const Memory = require('../models/Memory');
const MemoryUsageLog = require('../models/MemoryUsageLog');
const Consent = require('../models/Consent');
const PrivacyFlag = require('../models/PrivacyFlag');
const Conversation = require('../models/Conversation');
const ConversationTurn = require('../models/ConversationTurn');
const Suggestion = require('../models/Suggestion');

const DEMO_EMAIL = 'demo@careerpilot.ai';
const DEMO_PASSWORD = 'demo1234';

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

/** Save a document keeping its hand-set createdAt instead of letting timestamps override it. */
async function saveBackdated(doc) {
  doc.$timestamps(false);
  return doc.save();
}

const DEMO_SECTIONS = {
  personalInfo: {
    name: 'Farhan Qureshi',
    email: 'farhan.q@example.com',
    phone: '+91 98200 11223',
    location: 'Pune, India',
    linkedin: 'https://linkedin.com/in/farhanq',
    github: 'https://github.com/farhanq',
  },
  summary:
    'Marketing analyst of 5 years moving into data analytics. Built reporting pipelines and dashboards that shaped campaign strategy for a 40-person growth team.',
  experience: [
    {
      company: 'BrightReach Media',
      role: 'Senior Marketing Analyst',
      duration: '2021 — Present',
      bullets: [
        'Built automated reporting in SQL and Google Sheets used weekly by the growth team',
        'Ran A/B tests across 12 campaigns and presented findings to leadership',
        'Worked with engineering to define event tracking for the customer funnel',
      ],
    },
    {
      company: 'Nova Digital',
      role: 'Marketing Associate',
      duration: '2019 — 2021',
      bullets: [
        'Managed paid social budgets and reported on channel performance',
        'Created monthly performance decks for five retainer clients',
      ],
    },
  ],
  education: [
    {
      institution: 'Savitribai Phule Pune University',
      degree: 'B.Com, Marketing',
      year: '2019',
      gpa: '8.1/10',
    },
  ],
  skills: ['SQL', 'Excel', 'Google Analytics', 'A/B Testing', 'Tableau', 'Campaign Strategy'],
  projects: [
    {
      name: 'Churn Signal Dashboard',
      description:
        'Self-directed project analysing 18 months of subscription data to flag accounts at risk of churn.',
      techStack: ['SQL', 'Tableau'],
      link: '',
    },
  ],
  certifications: ['Google Data Analytics Certificate (2024)'],
};

const DEMO_JD_TEXT = `Data Analyst — Fintech Growth Team

We're looking for a Data Analyst to partner with product and growth.

Requirements:
- 3+ years in an analytical role
- Strong SQL; comfortable with large relational datasets
- Python (pandas) for analysis and automation
- Experience building dashboards (Tableau, Looker or similar)
- Statistics fundamentals: hypothesis testing, confidence intervals
- Experience with dbt or similar transformation tooling is a plus
- Excellent written communication with non-technical stakeholders`;

async function clearDemoData(userId) {
  // PrivacyFlag is keyed by resumeId, not userId — collect this user's resume ids
  // BEFORE deleting the resumes, so we only ever delete their own flags.
  const resumeIds = await Resume.find({ userId }).distinct('_id');

  await Promise.all([
    PrivacyFlag.deleteMany({ resumeId: { $in: resumeIds } }),
    Resume.deleteMany({ userId }),
    ResumeVersion.deleteMany({ userId }),
    JobDescription.deleteMany({ userId }),
    Match.deleteMany({ userId }),
    Memory.deleteMany({ userId }),
    MemoryUsageLog.deleteMany({ userId }),
    Consent.deleteMany({ userId }),
    Conversation.deleteMany({ userId }),
    ConversationTurn.deleteMany({ userId }),
    Suggestion.deleteMany({ userId }),
  ]);
}

async function seed({ force = false } = {}) {
  await connectDB({ exitOnError: false });

  // ── User ──
  let user = await User.findOne({ email: DEMO_EMAIL });

  if (user) {
    const existing = await Resume.countDocuments({ userId: user._id });
    if (existing > 0 && !force) {
      console.log(
        `⚠️  Demo account already has data. Re-run with --force to wipe and reseed:\n   npm run seed -- --force`
      );
      await disconnectDB();
      return;
    }
    if (force) {
      console.log('🧹 Clearing existing demo data…');
      await clearDemoData(user._id);
    }
  } else {
    user = await User.create({
      name: 'Farhan Qureshi',
      email: DEMO_EMAIL,
      passwordHash: DEMO_PASSWORD, // hashed by the pre-save hook
      personaType: 'switcher',
      tagline: 'Marketing → Data Analytics',
      jobTitle: 'Senior Marketing Analyst',
      skills: DEMO_SECTIONS.skills,
      summary: DEMO_SECTIONS.summary,
      experience: DEMO_SECTIONS.experience,
      education: DEMO_SECTIONS.education,
      projects: DEMO_SECTIONS.projects,
      personalInfo: DEMO_SECTIONS.personalInfo,
    });
  }

  const userId = user._id;

  // ── Resume + version history ──
  const resume = await Resume.create({
    userId,
    originalFileName: 'Farhan_Qureshi_Resume.pdf',
    fileType: 'pdf',
    filePath: 'uploads/demo/Farhan_Qureshi_Resume.pdf',
    sections: DEMO_SECTIONS,
    atsScore: 64,
    matchedSkills: ['SQL', 'Tableau', 'A/B Testing'],
    missingSkills: ['Python', 'Statistics', 'dbt'],
    lastJobDescription: DEMO_JD_TEXT,
  });

  const baselineSections = JSON.parse(JSON.stringify(DEMO_SECTIONS));
  baselineSections.summary = 'Marketing analyst with 5 years of experience.';

  // $timestamps(false) keeps the backdated createdAt — schema timestamps would
  // otherwise stamp both versions with "now" and flatten the demo timeline.
  await saveBackdated(
    new ResumeVersion({
      resumeId: resume._id,
      userId,
      versionNumber: 1,
      sections: baselineSections,
      diffSummary: 'Initial version',
      origin: 'baseline',
      createdAt: daysAgo(6),
    })
  );
  await saveBackdated(
    new ResumeVersion({
      resumeId: resume._id,
      userId,
      versionNumber: 2,
      sections: DEMO_SECTIONS,
      diffSummary: '1 change — summary (1)',
      origin: 'suggestion',
      createdAt: daysAgo(2),
    })
  );

  // ── Privacy flags ──
  await PrivacyFlag.create([
    { resumeId: resume._id, fieldPath: 'personalInfo.phone', flagType: 'pii', redacted: false },
    { resumeId: resume._id, fieldPath: 'personalInfo.location', flagType: 'pii', redacted: false },
  ]);

  // ── Consent (purposes locked in Phase 5) ──
  await Consent.create([
    { userId, purpose: 'scoring', dataCategory: 'resume_content', granted: true },
    { userId, purpose: 'chat_memory', dataCategory: 'career_facts', granted: true },
    { userId, purpose: 'chat_memory', dataCategory: 'sensitive_memory', granted: false },
    { userId, purpose: 'export', dataCategory: 'resume_content', granted: true },
  ]);

  // ── Job description with real gaps ──
  const jd = await JobDescription.create({
    userId,
    rawText: DEMO_JD_TEXT,
    title: 'Data Analyst',
    company: 'Northwind Fintech',
    extracted: {
      skillsFromResume: ['SQL', 'Tableau', 'A/B Testing', 'Excel', 'Google Analytics'],
      skillsRequiredInJob: ['SQL', 'Python', 'Tableau', 'Statistics', 'dbt', 'Communication'],
      matchingSkills: ['SQL', 'Tableau', 'Communication'],
      skillsToImprove: ['Python', 'Statistics', 'dbt'],
      mustHave: ['SQL', 'Python', 'Statistics'],
      niceToHave: ['dbt', 'Looker'],
      seniority: 'mid',
    },
    analyzedWithResumeId: resume._id,
  });

  // ── Match with a populated explanation trace ──
  const match = await Match.create({
    userId,
    resumeId: resume._id,
    jdId: jd._id,
    overallScore: 64,
    categoryBreakdown: {
      keyword_match: { score: 0.55, matched: ['SQL', 'Tableau'], missing: ['Python', 'dbt'] },
      experience_relevance: { score: 0.7 },
      formatting: { score: 0.85 },
    },
    explanationTrace: {
      reasoning: [
        {
          factor: 'Technical skills alignment',
          weight: 0.4,
          score: 0.55,
          evidence: 'SQL and Tableau match; Python and dbt are absent from the resume.',
        },
        {
          factor: 'Experience relevance',
          weight: 0.3,
          score: 0.7,
          evidence: 'Analytical work is present but framed in marketing rather than product terms.',
        },
        {
          factor: 'Keyword coverage',
          weight: 0.2,
          score: 0.6,
          evidence: "Missing: 'hypothesis testing', 'pandas', 'data transformation'.",
        },
        {
          factor: 'Formatting compatibility',
          weight: 0.1,
          score: 0.85,
          evidence: 'Clean single-column layout parses reliably in ATS software.',
        },
      ],
      confidence: 0.82,
      alternatives: [
        'Adding Python and a statistics signal would move this match into the high-70s.',
        'Reframing the churn project in product-analytics language would strengthen relevance.',
      ],
      sources: ['resume.skills', 'resume.projects[0]', 'jd.requirements'],
      criticReviewed: true,
      criticFlagsCount: 0,
    },
    quickWins: ['Add Python to skills once the course is complete', 'Quantify the A/B testing results'],
    atsVerdict: 'Promising career-switcher profile held back by two concrete tooling gaps.',
  });

  // ── Conversation with a memory citation ──
  const conversation = await Conversation.create({
    userId,
    title: "I'm pivoting from marketing into data analytics",
    mode: 'coach',
    resumeId: resume._id,
  });

  const userTurn = await ConversationTurn.create({
    conversationId: conversation._id,
    userId,
    role: 'user',
    content:
      "I'm pivoting from marketing into data analytics and I'm targeting fintech roles by March.",
  });

  // ── Memories in every negotiated state (the PS06 centrepiece) ──
  const memories = await Memory.create([
    {
      userId,
      type: 'career',
      category: 'goals',
      content: 'Transitioning from marketing into data analytics, targeting fintech roles.',
      rationale: 'To keep framing your resume around the pivot instead of your marketing past.',
      confidence: 0.95,
      sourceRef: { conversationId: conversation._id, turnId: userTurn._id, resumeId: resume._id },
      status: 'accepted',
      expiresAt: null,
    },
    {
      userId,
      type: 'long_term',
      category: 'skills',
      content: 'Core skills: SQL, Tableau, A/B testing.',
      rationale: 'To avoid re-asking about your toolkit in every session.',
      confidence: 0.92,
      sourceRef: { resumeId: resume._id },
      status: 'accepted',
      expiresAt: null,
    },
    {
      userId,
      type: 'temporary',
      category: 'goals',
      content: 'Applying to Northwind Fintech for a Data Analyst role this cycle.',
      rationale: 'To tailor suggestions to this application while it is active.',
      confidence: 0.9,
      sourceRef: { conversationId: conversation._id },
      status: 'accepted',
      expiresAt: daysFromNow(4), // shows up in the "Expiring Soon" panel
    },
    {
      userId,
      type: 'career',
      category: 'constraints',
      content: 'Wants to finish the transition by March.',
      rationale: 'To pace the learning roadmap against your deadline.',
      confidence: 0.88,
      sourceRef: { conversationId: conversation._id, turnId: userTurn._id },
      status: 'proposed', // a live Memory Card waiting on the demo user
    },
    {
      userId,
      type: 'hidden',
      category: 'inferred',
      content: 'May be underselling stakeholder-management experience.',
      rationale: 'Inferred from your resume, not something you told me — confirm before I use it.',
      confidence: 0.71,
      sourceRef: { resumeId: resume._id },
      status: 'proposed',
    },
    {
      userId,
      type: 'long_term',
      category: 'preferences',
      content: 'Prefers concise, achievement-first bullet phrasing.',
      rationale: 'To match your writing style in future drafts.',
      confidence: 0.86,
      sourceRef: { conversationId: conversation._id },
      status: 'rejected',
      rejectedInSessionId: conversation._id.toString(),
    },
  ]);

  const acceptedMemories = memories.filter((m) => m.status === 'accepted');

  const assistantTurn = await ConversationTurn.create({
    conversationId: conversation._id,
    userId,
    role: 'assistant',
    content:
      "Got it — a March target gives us about four months. Your SQL and Tableau work already transfers; the two real gaps for fintech analyst roles are Python and applied statistics. Want me to build a roadmap for those?",
    citedMemoryIds: acceptedMemories.map((m) => m._id),
    toolCall: { agentName: 'careerCoachAgent', intent: 'coach', confidence: 0.9 },
  });

  // ── "Used In" transparency log ──
  await MemoryUsageLog.create(
    acceptedMemories.map((m) => ({
      memoryId: m._id,
      userId,
      usedInType: 'chat',
      usedInRef: assistantTurn._id,
      usedInLabel: conversation.title,
    }))
  );
  await MemoryUsageLog.create({
    memoryId: acceptedMemories[0]._id,
    userId,
    usedInType: 'ats',
    usedInRef: match._id,
    usedInLabel: 'Match against Data Analyst @ Northwind Fintech',
  });

  // ── Pending suggestions for the approval queue ──
  const trace = (factor, evidence, confidence = 0.84) => ({
    reasoning: [{ factor, weight: 1, score: confidence, evidence }],
    confidence,
    alternatives: ['Approve to apply this to your resume, or reject to leave it unchanged.'],
    sources: ['resume.sections', 'jd.requirements'],
    criticReviewed: true,
    criticFlagsCount: 0,
  });

  await Suggestion.create([
    {
      userId,
      resumeId: resume._id,
      suggestionType: 'edit',
      title: 'Quantify the A/B testing result',
      diff: {
        path: 'experience.0.bullets.1',
        op: 'replace',
        before: 'Ran A/B tests across 12 campaigns and presented findings to leadership',
        after:
          'Ran A/B tests across 12 campaigns, lifting qualified signups 18% and presenting findings to leadership',
      },
      explanationTrace: trace(
        'Quantified impact',
        'The JD asks for measurable analytical outcomes; this bullet currently has no metric.'
      ),
      sourceRef: { matchId: match._id, jdId: jd._id },
      status: 'pending',
    },
    {
      userId,
      resumeId: resume._id,
      suggestionType: 'edit',
      title: 'Reframe the churn project in product-analytics language',
      diff: {
        path: 'projects.0.description',
        op: 'replace',
        before:
          'Self-directed project analysing 18 months of subscription data to flag accounts at risk of churn.',
        after:
          'Cohort analysis of 18 months of subscription data (SQL + Tableau) surfacing three churn predictors, presented as a dashboard for non-technical stakeholders.',
      },
      explanationTrace: trace(
        'Experience relevance',
        'The JD emphasises stakeholder communication and dashboards; the current wording omits both.'
      ),
      sourceRef: { matchId: match._id, jdId: jd._id },
      status: 'pending',
    },
    {
      userId,
      resumeId: resume._id,
      suggestionType: 'skill_add',
      title: 'Add analytics tooling you already demonstrate',
      diff: {
        path: 'skills',
        op: 'add',
        before: DEMO_SECTIONS.skills,
        after: ['Cohort Analysis', 'Data Visualization'],
      },
      explanationTrace: trace(
        'Keyword coverage',
        'Both skills are evidenced by your churn dashboard project but absent from the skills list.',
        0.79
      ),
      sourceRef: { matchId: match._id, jdId: jd._id },
      status: 'pending',
    },
    {
      userId,
      resumeId: resume._id,
      suggestionType: 'roadmap',
      title: 'Learning roadmap: Python',
      diff: { path: '', op: 'replace', before: null, after: null },
      roadmap: {
        skill: 'Python',
        prerequisites: [],
        milestones: [
          {
            order: 1,
            title: 'Python fundamentals',
            description: 'Syntax, data structures, and file I/O through small scripted exercises.',
            estimatedWeeks: 2,
          },
          {
            order: 2,
            title: 'pandas for analysis',
            description: 'Reproduce two existing SQL reports as pandas notebooks.',
            estimatedWeeks: 3,
          },
          {
            order: 3,
            title: 'Automate a real report',
            description: 'Convert your weekly growth report into a scheduled Python job.',
            estimatedWeeks: 2,
          },
        ],
        courses: [],
      },
      explanationTrace: trace(
        'Skill gap coverage',
        'Python is a must-have on the target JD and absent from your resume.',
        0.9
      ),
      sourceRef: { jdId: jd._id, skillGap: 'Python' },
      status: 'pending',
    },
    {
      userId,
      resumeId: resume._id,
      suggestionType: 'roadmap',
      title: 'Learning roadmap: Statistics',
      diff: { path: '', op: 'replace', before: null, after: null },
      roadmap: {
        skill: 'Statistics',
        prerequisites: ['Python'],
        milestones: [
          {
            order: 1,
            title: 'Hypothesis testing refresher',
            description: 't-tests, p-values and confidence intervals applied to your A/B test data.',
            estimatedWeeks: 2,
          },
          {
            order: 2,
            title: 'Experiment design',
            description: 'Power analysis and sample sizing for a campaign you already ran.',
            estimatedWeeks: 2,
          },
        ],
        courses: [],
      },
      explanationTrace: trace(
        'Skill gap coverage',
        'The JD lists statistics fundamentals as a requirement; your A/B testing work is a natural bridge.',
        0.87
      ),
      sourceRef: { jdId: jd._id, skillGap: 'Statistics' },
      status: 'pending',
    },
  ]);

  console.log(`
✅ Demo data seeded.

   Login:     ${DEMO_EMAIL}
   Password:  ${DEMO_PASSWORD}

   1 resume (2 versions) · 1 JD · 1 scored match with explanation trace
   6 memories (2 awaiting your decision, 1 expiring in 4 days)
   5 pending suggestions (3 resume edits, 2 learning roadmaps)
   2 privacy flags · 4 consent records
`);

  await disconnectDB();
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  seed({ force }).catch((err) => {
    console.error('❌ Seed failed:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
}

module.exports = { seed, DEMO_EMAIL, DEMO_PASSWORD };
