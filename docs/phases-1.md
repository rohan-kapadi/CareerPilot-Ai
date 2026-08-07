# 🧭 CareerPilot AI — Phased Implementation Plan

**Stack:** MongoDB · Express.js · React.js · Node.js (MERN)
**Database Choice Rationale:** CareerPilot's core data — resume content, JD extraction, memory cards, explanation traces, suggestion diffs — is deeply nested, variable-shape, and evolves per-feature (see `PROJECT.md` §17). This is a natural fit for **MongoDB's document model** over a rigid relational schema: a resume's `sections` array, a memory's `source_ref`, and an explanation's `reasoning[]` all vary in shape by type and would require constant migrations in a relational DB. MongoDB lets us store these as native nested documents while still relating collections via `ObjectId` references (`userId`, `resumeId`, `memoryId`) — giving us relational integrity where needed without schema rigidity where we don't.

This file breaks the entire `PROJECT.md` PRD into **8 buildable phases**. Each phase is self-contained enough that a new engineer (or a new AI coding agent session) can pick it up using only that phase's **Context Handoff** block — no need to re-read the whole PRD to continue work.

---

## How to Use This Document

- Each phase lists: **Goal → Depends On → What Gets Built → Exact Files/Folders → Collections Touched → APIs Added → Definition of Done → 📌 Context Handoff**.
- The **📌 Context Handoff** block at the end of every phase is written *for the next agent/session* — it states what now exists, what decisions were locked in, and what the next phase must NOT break. Always read the previous phase's handoff block before starting a new one.
- File paths are absolute from the repo root `careerpilot-ai/`.

---

# 🔗 Actual Repository Reuse Map

This section reflects the **real code** in both repos (checked directly), not just their feature lists. It corrects one important assumption: **RoleReady and AdaptIQ do not share a backend language**, so the merge strategy differs per repo.

## Repo 1 — [RoleReady](https://github.com/YASH-DHADGE/RoleReady) (YASH-DHADGE)

**Real structure:**
```
ai-resume-builder/
├── client/          → React 18 + Vite + TailwindCSS + Radix UI (port 5173)
├── server/          → Express 5 + Mongoose + MongoDB Atlas, JWT auth (port 5000)
├── python-service/  → FastAPI AI microservice — Mistral Large (parsing) + Groq LLaMA3-70B (skill extraction) + sentence-transformers embeddings (port 8000)
├── chrome-extension/→ Manifest V3, LinkedIn DOM scraping
└── docker-compose.yml
```

**Already MERN-shaped** (Express + Mongoose + MongoDB + React) — this is our **primary backend skeleton**, not a reference to rewrite.

| RoleReady file/module | Reuse decision | Where it lands in CareerPilot AI |
|---|---|---|
| `server/` (Express 5 + Mongoose app, JWT auth) | ✅ **Take as-is, becomes our base server** | `server/server.js`, `server/config/db.js`, `server/middleware/authMiddleware.js` |
| `POST /api/auth/register`, `/api/auth/login` | ✅ Take as-is | `server/controllers/authController.js`, `server/routes/authRoutes.js` (Phase 0) |
| `POST /api/resume/upload` + Mistral-based parsing (`python-service`) | ✅ Take as-is | `server/controllers/resumeController.js` + `server/services/parsingService.js` (calls `python-service`) (Phase 1) |
| `GET /api/resume/:id`, `PUT /api/resume/:id/sections`, `PATCH /api/resume/:id/skills` | ✅ Take as-is | Same controller, extended later with approval-gating in Phase 6 |
| `POST /api/job/analyze` (ATS scoring) | ✅ Take as-is, ⚠️ extend with explanation trace (Phase 4) | `server/controllers/matchController.js`, `server/agents/atsAgent.js` |
| Skill matching via `sentence-transformers` embeddings (`python-service`) | ✅ Take as-is | `server/services/embeddingService.js` calls into `python-service` unchanged |
| `POST /api/export/:id/docx`, `/pdf`, `/email` (docxtemplater, Puppeteer, Nodemailer) | ✅ Take as-is | `server/services/exportService.js` (Phase 7) |
| `python-service/` (FastAPI, Mistral, Groq) | ✅ **Keep this microservice pattern** | Becomes the single AI microservice — AdaptIQ's Python logic (below) is merged into this same service rather than run as a second Flask app |
| `chrome-extension/` (LinkedIn scraping) | ⏸️ Not built in the hackathon timeline — moved to Future Scope (§22) | N/A for Phase 0–8 |
| Client scaffold (Vite + Tailwind + Radix) | ✅ Take as-is as our `client/` starting point | `client/` root config, `tailwind.config.js`, base component primitives |

## Repo 2 — [AdaptIQ](https://github.com/rohan-kapadi/AdaptIQ) (rohan-kapadi)

**Real structure:**
```
.
├── backend/         → Flask + PyMongo + Groq (NOT Node — port 5000 by default)
│   ├── app.py             # Main Flask API: auth, skill-analyzer, quiz, course rec
│   ├── rec_courses.py     # TF-IDF + cosine similarity course recommender
│   ├── sampled_data.csv   # Course dataset
│   ├── analyzer.py, auth.py, rec_upskilling.py   # Legacy/unused prototypes
└── frontend/        → React + Vite + Tailwind + Chart.js + jsPDF + QRCode (port 5173)
    └── src/Components/
        ├── Analyze.jsx, DiagnosticQuiz.jsx, SkillDependencyGraph.jsx,
        │   SkillsVisualization.jsx, SignIn.jsx, SignUp.jsx, Profile.jsx, ...
        └── utils/api.js, auth.jsx, generateReport.js
```

**Backend is Flask, not Express** — its code cannot be dropped into our Node server directly. The **logic and prompts port over**; the **runtime does not**. Two of AdaptIQ's Python pieces (skill-gap JSON extraction, TF-IDF course recommender) are genuinely reusable *as algorithms* — we move them into RoleReady's existing `python-service/` (FastAPI) rather than standing up a second Python backend.

| AdaptIQ file/module | Reuse decision | Where it lands in CareerPilot AI |
|---|---|---|
| `backend/app.py` → `/skill-analyzer` (Groq prompt returning `skills_from_resume`, `skills_required_in_job`, `matching_skills`, `skills_to_improve`) | 🔁 **Port the prompt + JSON schema**, not the Flask route | Logic moves into `server/agents/jdAgent.js` / `atsAgent.js` (Phase 1), calling `python-service` |
| `backend/rec_courses.py` + `sampled_data.csv` (TF-IDF + cosine similarity) | 🔁 **Port algorithm as-is into `python-service`** — this is real, working scikit-learn code worth keeping | New `python-service/routers/course_recommender.py`; called from `server/agents/recommendationAgent.js` (Phase 6, Learning Roadmap) |
| `frontend/src/Components/SkillDependencyGraph.jsx` | 🔁 **Port component, adapt to our design system** | `client/src/components/resume/RoadmapTimeline.jsx` / a new `SkillDependencyGraph.jsx` (Phase 6) |
| `frontend/src/Components/DiagnosticQuiz.jsx` + `/generate-quiz` route | 🆕 **New feature not in original PROJECT.md scope** — optional Phase 6/Future Scope addition; port logic into `recommendationAgent.js` if time allows | `client/src/components/roadmap/DiagnosticQuiz.jsx` (Future Scope §22 unless time permits in Phase 6) |
| `frontend/src/utils/generateReport.js` (jsPDF + QR codes) | 🔁 **Port pattern** for export | Informs `server/services/exportService.js` / `client/src/components/common/ExportModal.jsx` (Phase 7) — QR-to-resources idea folded into Learning Roadmap export |
| `frontend/src/Components/Analyze.jsx` (upload + dashboard UI) | 🔁 Reference only — our version is rebuilt around Memory/Explainability/Approval, not copied directly | Superseded by `client/src/pages/ResumeViewerPage.jsx` + `AISuggestionsPage.jsx` |
| `frontend/src/Components/Profile.jsx` + user schema (`skills[]`, `skills_to_improve[]`, `tagline`, `job`) | 🔁 **Port field shapes as inspiration** for our richer, memory-backed profile | `server/models/User.js` extended fields; `client/src/pages/ProfilePage.jsx` (Phase 2/3) |
| `backend/auth.py`, Flask signup/login (`/api/signup`, `/api/login`) | ⏸️ **Not reused** — RoleReady's Express/JWT auth (already MERN-native) is used instead | N/A — superseded by Phase 0 |
| `analyzer.py`, `rec_upskilling.py` (explicitly marked legacy/unused in AdaptIQ's own README) | ❌ Not reused | N/A |

## What This Means for the Tech Stack

- **`server/` (Node/Express)** = RoleReady's server, extended.
- **`python-service/` (FastAPI)** = RoleReady's AI microservice, extended to absorb AdaptIQ's skill-gap prompt logic and TF-IDF course recommender. **We do not run AdaptIQ's Flask app at all** — only its algorithms, ported.
- **LLM providers**: both source repos already use **Mistral Large** (parsing) and **Groq LLaMA3-70B** (skill extraction/coaching) — not Gemini. `server/services/llmService.js` and `python-service`'s LLM client should target **Mistral + Groq** to match the real, working, already-tested prompts in these repos, with the abstraction left pluggable for later.
- **No Qdrant** — neither repo uses a vector DB; RoleReady's `sentence-transformers` embeddings are compared directly (cosine similarity) without a persistent vector store. We carry this forward: **no vector DB in the hackathon build**, embeddings computed on-demand. Add Qdrant only if Future Scope work requires persistent semantic memory search at larger scale.

---

# 📐 Full Project Folder Structure (Target State — All Phases Combined)

```
careerpilot-ai/
├── client/                                # React frontend
│   ├── public/
│   ├── src/
│   │   ├── api/                           # Axios instances + API call wrappers
│   │   │   ├── axiosClient.js
│   │   │   ├── resumeApi.js
│   │   │   ├── jdApi.js
│   │   │   ├── matchApi.js
│   │   │   ├── memoryApi.js
│   │   │   ├── privacyApi.js
│   │   │   ├── chatApi.js
│   │   │   └── authApi.js
│   │   ├── components/
│   │   │   ├── common/                    # Buttons, Modals, Loaders, Toasts
│   │   │   ├── resume/                    # ResumeCanvas, SectionEditor, ScoreRadar
│   │   │   ├── jd/                        # JDBreakdown, SkillChipEditor
│   │   │   ├── matching/                  # MatchScoreCard, SkillGapGrid
│   │   │   ├── suggestions/               # SuggestionDiffCard, BulkApprovalBar
│   │   │   ├── memory/                    # MemoryCard, MemoryTimeline, MemoryGraph, MemoryDashboardWidget
│   │   │   ├── privacy/                   # ConsentToggle, RedactionPreview, PrivacyFlagBanner
│   │   │   ├── explainability/            # ReasoningTrace, ConfidenceBadge, SourceHighlighter
│   │   │   ├── chat/                      # ChatThread, MemoryCitationChip
│   │   │   └── layout/                    # Navbar, Sidebar, PageShell
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── SignupPage.jsx / LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ResumeBuilderPage.jsx
│   │   │   ├── ResumeViewerPage.jsx
│   │   │   ├── JDViewerPage.jsx
│   │   │   ├── AISuggestionsPage.jsx
│   │   │   ├── MemoryDashboardPage.jsx
│   │   │   ├── PrivacyDashboardPage.jsx
│   │   │   ├── ExplainabilityPage.jsx
│   │   │   ├── CareerAssistantPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── context/                       # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   ├── MemoryContext.jsx          # holds active memory state, refresh triggers
│   │   │   └── UIContext.jsx
│   │   ├── hooks/
│   │   │   ├── useMemoryCards.js
│   │   │   ├── useExplanationTrace.js
│   │   │   └── useApprovalQueue.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── routes.jsx
│   ├── package.json
│   └── .env
│
├── server/                                # Node + Express backend
│   ├── config/
│   │   ├── db.js                          # MongoDB connection (Mongoose)
│   │   └── env.js
│   ├── models/                            # Mongoose schemas
│   │   ├── User.js
│   │   ├── Resume.js
│   │   ├── ResumeVersion.js
│   │   ├── JobDescription.js
│   │   ├── Match.js
│   │   ├── Memory.js
│   │   ├── MemoryUsageLog.js
│   │   ├── Consent.js
│   │   ├── PrivacyFlag.js
│   │   ├── Conversation.js
│   │   ├── ConversationTurn.js
│   │   └── Suggestion.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── resumeController.js
│   │   ├── jdController.js
│   │   ├── matchController.js
│   │   ├── suggestionController.js
│   │   ├── memoryController.js
│   │   ├── privacyController.js
│   │   ├── chatController.js
│   │   └── roadmapController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── resumeRoutes.js
│   │   ├── jdRoutes.js
│   │   ├── matchRoutes.js
│   │   ├── suggestionRoutes.js
│   │   ├── memoryRoutes.js
│   │   ├── privacyRoutes.js
│   │   ├── chatRoutes.js
│   │   └── roadmapRoutes.js
│   ├── agents/                            # LLM agent logic (Node-side orchestration)
│   │   ├── plannerAgent.js
│   │   ├── resumeBuilderAgent.js
│   │   ├── atsAgent.js
│   │   ├── jdAgent.js
│   │   ├── recommendationAgent.js
│   │   ├── careerCoachAgent.js
│   │   ├── criticAgent.js
│   │   ├── evaluatorAgent.js
│   │   ├── memoryAgent.js
│   │   ├── privacyAgent.js
│   │   └── orchestrator.js                # Routes intent → agents, sequences calls
│   ├── services/
│   │   ├── llmService.js                  # Wraps LLM API calls (Gemini/OpenAI)
│   │   ├── embeddingService.js            # Vector embeddings for matching/RAG
│   │   ├── parsingService.js              # PDF/DOCX resume parsing
│   │   ├── piiDetectionService.js
│   │   ├── redactionService.js
│   │   └── exportService.js               # PDF/DOCX generation
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   └── validateRequest.js
│   ├── utils/
│   │   ├── scoringRubric.js
│   │   └── memoryClassifier.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── shared/
│   └── schemas/                           # Shared JSON shape references (docs, not enforced types)
│       ├── resumeSchema.md
│       ├── memorySchema.md
│       └── explanationTraceSchema.md
│
├── docs/
│   ├── PROJECT.md
│   └── phases.md
│
└── README.md
```

---

# 🟦 PHASE 0 — Foundation & Environment Setup

## Goal
Stand up the MERN skeleton, database connection, and auth — the base every later phase builds on.

## Depends On
Nothing (first phase).

## What Gets Built
- Express server with MongoDB (Mongoose) connection.
- React app shell with routing and layout components.
- User auth (JWT-based signup/login).
- Base `User` model.

## Exact Files/Folders Created

| File | Purpose |
|---|---|
| `server/server.js` | Express app entry point, mounts routes, connects DB |
| `server/config/db.js` | Mongoose connection to MongoDB (local or Atlas) |
| `server/config/env.js` | Centralized `process.env` loader/validator |
| `server/models/User.js` | Mongoose schema: `{ name, email, passwordHash, personaType, createdAt }` |
| `server/controllers/authController.js` | `signup`, `login`, `getMe` handlers |
| `server/routes/authRoutes.js` | `/api/auth/signup`, `/api/auth/login`, `/api/auth/me` |
| `server/middleware/authMiddleware.js` | JWT verification middleware, attaches `req.user` |
| `server/middleware/errorHandler.js` | Global error-handling middleware |
| `client/src/App.jsx`, `client/src/main.jsx`, `client/src/routes.jsx` | App shell, router setup |
| `client/src/context/AuthContext.jsx` | Auth state, login/logout functions, token storage |
| `client/src/pages/LandingPage.jsx`, `SignupPage.jsx`, `LoginPage.jsx` | Base pages (§13.1 of PROJECT.md) |
| `client/src/components/layout/Navbar.jsx`, `Sidebar.jsx`, `PageShell.jsx` | Shared layout shell used by every later page |
| `client/src/api/axiosClient.js`, `authApi.js` | Base Axios instance + auth calls |

## Collections Touched
- `users`

## APIs Added
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

## Definition of Done
- User can sign up, log in, and land on an empty `DashboardPage.jsx` shell.
- JWT auth guards all subsequent routes.

## 📌 Context Handoff (read this before starting Phase 1)
- **Stack locked:** MERN, MongoDB via Mongoose, JWT auth (stored in `localStorage`, attached via `axiosClient.js` interceptor).
- **Existing collections:** `users` only.
- **Existing pages:** `LandingPage`, `SignupPage`, `LoginPage`, empty `DashboardPage`.
- **Do not** rebuild auth in later phases — always import `authMiddleware.js` to protect new routes and read `req.user._id` for ownership checks.
- **Persona field** (`user.personaType`) already exists on `User` — later phases (esp. Career Chat, Explainability tone) should read this rather than re-asking the user.

---

# 🟦 PHASE 1 — Resume & JD Core Engine (RoleReady Merge)

## Goal
Bring RoleReady's `server/` + `python-service/` into this codebase as the working base for resume upload/parsing, ATS scoring, JD analysis, and matching — then layer AdaptIQ's skill-gap JSON schema on top (ported, per the Reuse Map above).

## Depends On
Phase 0 (auth, DB connection).

## What Gets Built
- **Import RoleReady's `server/` and `python-service/` folders directly** into this repo as the starting point — not rebuilt from scratch.
- Resume upload + Mistral-based parsing into structured MongoDB documents (RoleReady's existing pipeline).
- JD upload + structured extraction, **now producing AdaptIQ's four-field schema** (`skills_from_resume`, `skills_required_in_job`, `matching_skills`, `skills_to_improve`) ported into `jdAgent.js`, instead of RoleReady's original single ATS-score-only output.
- ATS scoring engine (RoleReady's rubric, reused as-is).
- Resume-JD matching engine (RoleReady's `sentence-transformers` cosine similarity, called via `python-service`).

## Exact Files/Folders Created

| File | Source | Purpose |
|---|---|---|
| `server/models/Resume.js` | 🔁 Adapt RoleReady's Mongoose resume schema | `{ userId, title, sections: {...}, currentVersion, createdAt, updatedAt }` |
| `server/models/JobDescription.js` | 🆕 New (RoleReady had no persisted JD model — `/api/job/analyze` was stateless) | `{ userId, rawText, extracted: { skillsFromResume, skillsRequiredInJob, matchingSkills, skillsToImprove, mustHave, niceToHave, seniority }, createdAt }` — field names intentionally match AdaptIQ's ported schema |
| `server/models/Match.js` | 🆕 New (RoleReady returned scores inline, didn't persist them) | `{ resumeId, jdId, overallScore, categoryBreakdown, explanationTrace, createdAt }` |
| `server/services/parsingService.js` | ✅ Ported from RoleReady `python-service` (Mistral-based parsing) | Extracts text from PDF/DOCX → structured resume JSON |
| `server/utils/scoringRubric.js` | ✅ Ported from RoleReady's `/api/job/analyze` scoring logic | Weighted scoring logic (impact, ATS-compatibility, clarity, keyword coverage) |
| `server/agents/atsAgent.js` | ✅ Wraps RoleReady's existing ATS scoring call | Calls `llmService.js` + `scoringRubric.js` to produce score + draft explanation |
| `server/agents/jdAgent.js` | 🔁 **Ported from AdaptIQ's `backend/app.py` `/skill-analyzer` prompt** (Groq JSON-schema extraction), now called via `python-service` instead of Flask | Extracts `skills_from_resume` / `skills_required_in_job` / `matching_skills` / `skills_to_improve` from raw JD text |
| `server/services/llmService.js` | ✅ Adapted from RoleReady's Mistral/Groq clients | Shared LLM API wrapper — targets **Mistral Large + Groq LLaMA3-70B** (matching both source repos), used by all agents from here on |
| `server/services/embeddingService.js` | ✅ Ported from RoleReady's `sentence-transformers` (`python-service`) | Generates on-demand embeddings for resume sections + JD requirements (no persistent vector DB — matches both repos' approach) |
| `server/controllers/resumeController.js` | ✅ Ported from RoleReady's `resume.controller` | `uploadResume`, `getResume`, `analyzeResume` |
| `server/controllers/jdController.js` | 🆕 New (wraps ported `jdAgent.js`) | `uploadJD`, `getJD` |
| `server/controllers/matchController.js` | 🔁 Extends RoleReady's `/api/job/analyze` to persist results | `matchResumeToJD`, `getMatch` |
| `server/routes/resumeRoutes.js` | ✅ Ported from RoleReady (`/api/resume/upload`, `/api/resume/:id`, `/api/resume/:id/sections`, `/api/resume/:id/skills`) | Renamed to REST-plural convention: `/api/resumes`, `/api/resumes/:id`, `/api/resumes/:id/analyze` |
| `server/routes/jdRoutes.js` | 🆕 New | `/api/jds` |
| `server/routes/matchRoutes.js` | 🔁 Extends RoleReady's `/api/job/analyze` route | `/api/matching` |
| `python-service/routers/skill_gap.py` | 🔁 **Ported from AdaptIQ `backend/app.py`** `/skill-analyzer` logic, rewritten as a FastAPI router inside RoleReady's existing microservice | Called by `jdAgent.js` |
| `client/src/pages/ResumeViewerPage.jsx`, `JDViewerPage.jsx` | 🆕 New (RoleReady/AdaptIQ had no equivalent read-only structured views) | Read-only structured views |
| `client/src/components/resume/ResumeCanvas.jsx`, `ScoreRadar.jsx` | 🔁 `ResumeCanvas` adapted from RoleReady's inline editor UI; `ScoreRadar` new (RoleReady showed a single score, not a radar breakdown) | Resume display + score visualization |
| `client/src/components/jd/JDBreakdown.jsx`, `SkillChipEditor.jsx` | 🆕 New, shaped around AdaptIQ's `skills_to_improve` / `matching_skills` fields | JD structured display |
| `client/src/components/matching/MatchScoreCard.jsx`, `SkillGapGrid.jsx` | 🔁 `SkillGapGrid` adapted from AdaptIQ's `SkillsVisualization.jsx` chart | Match results UI |
| `client/src/api/resumeApi.js`, `jdApi.js`, `matchApi.js` | 🔁 Adapted from RoleReady's `utils/api.js` + AdaptIQ's `utils/api.js` Axios patterns | Frontend API wrappers |

## Collections Touched
- `resumes`, `jobdescriptions`, `matches`

## APIs Added
- `POST /api/resumes` · `GET /api/resumes/:id` · `POST /api/resumes/:id/analyze`
- `POST /api/jds` · `GET /api/jds/:id`
- `POST /api/matching` · `GET /api/matching/:id`

## Definition of Done
- User uploads a resume → sees parsed structured view + numeric score.
- User pastes a JD → sees extracted skill breakdown.
- User matches resume to JD → sees overall score + category breakdown + gap grid.
- **No explanation UI yet** — scores show numbers only; `explanationTrace` field is already being saved in `Match` documents for Phase 4 to consume.

## 📌 Context Handoff (read this before starting Phase 2)
- **New collections:** `resumes`, `jobdescriptions`, `matches` — all reference `userId` (ObjectId → `users`).
- **`llmService.js` now exists**, targeting **Mistral Large + Groq LLaMA3-70B** (not Gemini) — all future agents (Phase 2 onward) must reuse this, not create new LLM clients or introduce a third provider.
- **`python-service/` (FastAPI) is now the single AI microservice**, carried over from RoleReady and already extended with `routers/skill_gap.py` (ported from AdaptIQ). **Phase 2 must add AdaptIQ's remaining Python logic (course recommender) into this same service — do not spin up AdaptIQ's Flask app separately.**
- **`explanationTrace` field already exists** on `Match` documents (populated by `atsAgent.js`) but is NOT yet rendered anywhere in the UI — Phase 4 builds the UI for data that already exists here. Do not regenerate this data structure later; extend it.
- **Resume schema shape** (`Resume.sections`) is now the canonical structure every later feature (Builder, Optimizer, Version History) must read/write against — do not introduce a second resume shape, and do not reintroduce AdaptIQ's separate `users.skills[]` array as a parallel source of truth (its fields are folded into `User`/`Memory` instead, starting Phase 2/3).
- **No memory, no privacy, no approval gating yet** — resume edits at this stage are direct writes. Phase 3 and Phase 6 will retrofit gating around this; Phase 1 code should remain functionally intact, just wrapped later.

---

# 🟦 PHASE 2 — Conversational Builder & Career Chat (AdaptIQ Merge)

## Goal
Port AdaptIQ's conversational/chat-adjacent logic and course recommender into the Node+FastAPI base built in Phase 1. **Important:** since AdaptIQ's backend is Flask, "porting" here means re-implementing its prompts/algorithms inside `server/agents/` (Node) and `python-service/` (FastAPI) — not importing Flask code.

## Depends On
Phase 1 (`Resume` model, `llmService.js`, `python-service` extended with `skill_gap.py`).

## What Gets Built
- Conversational, section-by-section resume builder (new — neither repo had this exact flow; RoleReady had a static inline editor, AdaptIQ had none).
- Career Chat with conversation persistence, using AdaptIQ's Groq-based coaching prompts as a starting point (reworked from its ad hoc chat logic in `app.py`).
- Course recommender ported into `python-service` (from AdaptIQ's `rec_courses.py` + `sampled_data.csv`).
- Profile page, seeded with AdaptIQ's profile field shapes (`skills[]`, `skills_to_improve[]`, `tagline`, `job`) but backed by our own `User`/`Resume` models — not AdaptIQ's Mongo `users` collection.

## Exact Files/Folders Created

| File | Source | Purpose |
|---|---|---|
| `server/models/Conversation.js` | 🆕 New | `{ userId, createdAt }` |
| `server/models/ConversationTurn.js` | 🆕 New | `{ conversationId, role, content, citedMemoryIds: [], createdAt }` (citedMemoryIds populated starting Phase 3) |
| `server/agents/resumeBuilderAgent.js` | 🆕 New (no direct equivalent in either repo) | Drafts section content conversationally, one section at a time |
| `server/agents/careerCoachAgent.js` | 🔁 Reworked from AdaptIQ's Groq chat/coaching calls in `backend/app.py` | Handles open-ended chat guidance |
| `server/agents/plannerAgent.js` | 🆕 New | Routes chat intent → builder vs. coach vs. analyzer |
| `server/controllers/chatController.js` | 🆕 New | `sendMessage`, `getConversation` |
| `server/routes/chatRoutes.js` | 🆕 New | `/api/chat` |
| `python-service/routers/course_recommender.py` | 🔁 **Ported from AdaptIQ `backend/rec_courses.py`** (TF-IDF + cosine similarity, scikit-learn) — the dataset `sampled_data.csv` is copied over unchanged | Called by `recommendationAgent.js` in Phase 6 for Learning Roadmap course links |
| `client/src/pages/ResumeBuilderPage.jsx` | 🔁 UI shell adapted from RoleReady's inline editor (`Analyze.jsx`-adjacent patterns), conversational flow is new | Conversational builder UI |
| `client/src/pages/CareerAssistantPage.jsx` | 🆕 New (neither repo has a persistent chat UI) | Chat UI |
| `client/src/pages/ProfilePage.jsx` | 🔁 Adapted from AdaptIQ's `frontend/src/Components/Profile.jsx` (field shapes: skills, tagline, job title) | Static profile view (read-only until Phase 3) |
| `client/src/components/resume/SectionEditor.jsx` | 🔁 Adapted from RoleReady's inline auto-save editor | Inline suggestion accept/edit/reject chip (accept-only logic added fully in Phase 6) |
| `client/src/components/chat/ChatThread.jsx` | 🆕 New | Chat message list |
| `client/src/api/chatApi.js` | 🆕 New | Frontend chat API wrapper |

## Collections Touched
- `conversations`, `conversationturns` (also writes to `resumes`)

## APIs Added
- `POST /api/chat` · `GET /api/chat/:conversationId`

## Definition of Done
- User can build a resume section-by-section conversationally.
- User can chat with the Career Coach and see persisted conversation history on return.
- Profile page renders whatever is in `Resume.sections` (not yet memory-backed).

## 📌 Context Handoff (read this before starting Phase 3)
- **New collections:** `conversations`, `conversationturns`.
- **`python-service/routers/course_recommender.py` now exists**, ported from AdaptIQ's `rec_courses.py` — Phase 6's `recommendationAgent.js` will call this for Learning Roadmap course links. Do not reimplement TF-IDF matching elsewhere.
- **`ConversationTurn.citedMemoryIds` field already exists but is always empty right now** — Phase 3's Memory Agent must populate this array when the Career Coach references a memory.
- **`plannerAgent.js` now exists** as the intent router — Phase 3's `memoryAgent.js` and Phase 5's `privacyAgent.js` must be invoked *from within* this planner's flow, not as a separate parallel system.
- **AdaptIQ's `SkillDependencyGraph.jsx` and `DiagnosticQuiz.jsx` have NOT been ported yet** — they land in Phase 6 (roadmap) and Future Scope respectively. Don't build competing versions of these in Phase 3/4/5.
- **Important constraint carried forward:** the Resume Builder currently applies AI-drafted section content directly on accept — this is fine for now, but Phase 6 (Human Approval Workflow) will formalize this into the shared `Suggestion` model. Do not let Phase 3/4/5 build competing approval mechanisms — they should assume Phase 6 will unify them.

---

# 🟦 PHASE 3 — Memory Negotiation System (Core Innovation)

## Goal
Build the entire Memory Negotiation System from `PROJECT.md` §7 — the primary hackathon deliverable.

## Depends On
Phase 2 (`plannerAgent.js`, `ConversationTurn.citedMemoryIds`).

## What Gets Built
- `Memory` model with full taxonomy (session/temporary/long_term/career/sensitive/hidden).
- Memory Agent: detects candidate facts during chat/resume actions, classifies, proposes Memory Cards.
- Memory Card UI (accept/modify/reject/timebox).
- Memory Dashboard: Timeline + Graph + category filters + expiring-soon panel.
- Forget Flow with impact preview.
- Memory usage logging ("Used In").

## Exact Files/Folders Created

| File | Purpose |
|---|---|
| `server/models/Memory.js` | `{ userId, type, category, content, confidence, sourceRef, status, expiresAt, createdAt, updatedAt }` |
| `server/models/MemoryUsageLog.js` | `{ memoryId, usedInType, usedInRef, createdAt }` |
| `server/agents/memoryAgent.js` | Detects candidate facts from conversation/resume context, classifies type/category, generates proposed Memory Card payloads — **never writes directly**, only proposes |
| `server/utils/memoryClassifier.js` | Rule-based + LLM-assisted classification: session vs. temporary vs. long_term vs. sensitive vs. hidden |
| `server/controllers/memoryController.js` | `listMemories`, `proposeMemory` (internal), `decideMemory` (accept/modify/reject/timebox), `getMemoryUsage`, `forgetMemory` (with `?preview=true` impact mode) |
| `server/routes/memoryRoutes.js` | `/api/memory`, `/api/memory/:id/decision`, `/api/memory/:id/usage`, `/api/memory/:id/forget` |
| `client/src/components/memory/MemoryCard.jsx` | The negotiation card UI (§7.2) |
| `client/src/components/memory/MemoryTimeline.jsx` | Chronological feed (§7.3) |
| `client/src/components/memory/MemoryGraph.jsx` | D3-based node-link graph (§7.5) — new dependency: `d3` in `client/package.json` |
| `client/src/components/memory/MemoryDashboardWidget.jsx` | Summary widget for `DashboardPage.jsx` |
| `client/src/pages/MemoryDashboardPage.jsx` | Full dashboard (§13.7) |
| `client/src/context/MemoryContext.jsx` | Holds active memory list, triggers refresh after any decision |
| `client/src/hooks/useMemoryCards.js` | Polls/subscribes to newly proposed Memory Cards during a chat session |
| `client/src/api/memoryApi.js` | Frontend API wrapper |

## Collections Touched
- `memories`, `memoryusagelogs` (also reads/writes `conversationturns.citedMemoryIds`)

## APIs Added
- `GET /api/memory` (filterable by type/category/status)
- `POST /api/memory/:id/decision`
- `GET /api/memory/:id/usage`
- `POST /api/memory/:id/forget` (+ `?preview=true`)

## Definition of Done
- During a Career Chat conversation, the Memory Agent proposes a Memory Card mid-conversation.
- User can accept/modify/reject/timebox it; decision is persisted and reflected in `MemoryDashboardPage.jsx`.
- Memory Graph renders nodes colored by type, sized by confidence.
- Forgetting a memory first shows an impact preview (`MemoryUsageLog` lookup), then soft-deletes.
- Expiring memories are visually flagged in the dashboard.

## 📌 Context Handoff (read this before starting Phase 4)
- **New collections:** `memories`, `memoryusagelogs`.
- **`memoryAgent.js` NEVER writes directly to the `memories` collection with `status: 'accepted'`** — it only creates documents with `status: 'proposed'`. Only `memoryController.decideMemory` (triggered by user action) can transition status. **This rule must not be broken by any later phase** — it is the entire point of PS06 alignment.
- **`MemoryContext.jsx`** is now the single source of truth for memory state on the frontend — Phase 4 (Explainability) and Phase 6 (Approval Workflow) should consume this context rather than fetching memory state independently.
- **Confidence field** on `Memory` (0–1 float) is already being set by `memoryClassifier.js` — Phase 4's Evaluator Agent should reuse this same confidence convention (not introduce a second scale) for `explanationTrace.confidence`.
- **`d3` dependency added** to `client/package.json` — reuse the same version for any future visualizations rather than adding a competing charting lib.

---

# 🟦 PHASE 4 — Explainable AI System

## Goal
Build the explanation trace layer from `PROJECT.md` §8, surfaced across resume scoring, matching, and recommendations.

## Depends On
Phase 1 (`Match.explanationTrace` field already exists but unused), Phase 3 (confidence convention).

## What Gets Built
- Standardized `ExplanationTrace` structure reused everywhere (backend already partially producing it since Phase 1).
- Evaluator Agent that formalizes confidence + alternatives + sources on top of raw agent output.
- Explainability UI: `ReasoningTrace`, `ConfidenceBadge`, `SourceHighlighter`.
- Dedicated Explainability Screen.

## Exact Files/Folders Created

| File | Purpose |
|---|---|
| `server/agents/evaluatorAgent.js` | Wraps any agent output (ATS, Recommendation, JD) into the standardized `explanationTrace` shape: `{ reasoning[], confidence, alternatives[], sources[] }` |
| `server/agents/criticAgent.js` | Reviews agent output for overreach/hallucination before it's shown to user — flags low-confidence claims for downgrade to "unconfirmed inference" |
| `shared/schemas/explanationTraceSchema.md` | Canonical documented shape of the trace object, referenced by both frontend and backend devs |
| `client/src/components/explainability/ReasoningTrace.jsx` | Expandable factor list with weights (consumes `explanationTrace.reasoning[]`) |
| `client/src/components/explainability/ConfidenceBadge.jsx` | Inline colored badge (green/amber/red) |
| `client/src/components/explainability/SourceHighlighter.jsx` | Hover-to-highlight source resume/JD text |
| `client/src/pages/ExplainabilityPage.jsx` | Deep-dive screen (§13.9) |
| `client/src/hooks/useExplanationTrace.js` | Fetches/caches trace data per score/match/suggestion id |

## Collections Touched
- No new collections — extends `explanationTrace` sub-document already present on `Match` (Phase 1) and adds the same field to `Suggestion` (introduced fully in Phase 6, stubbed here if needed).

## APIs Added
- No new routes — `GET /api/resumes/:id/analyze` and `GET /api/matching/:id` responses are extended to return the full `explanationTrace`, now actually populated via `evaluatorAgent.js` instead of left partially empty.

## Definition of Done
- Every resume score and match score shows a "Why?" button opening `ReasoningTrace`.
- Confidence badges appear next to every AI-generated skill/keyword suggestion.
- Hovering an explanation highlights the exact source text in the resume/JD viewer.

## 📌 Context Handoff (read this before starting Phase 5)
- **`evaluatorAgent.js` is now the mandatory final step** for any agent output shown to the user — Phase 5 (Privacy Agent) and Phase 6 (Recommendation flows) must route their outputs through it before display, reusing the same `explanationTrace` shape.
- **No new collections** — this phase is additive/UI-only on top of Phase 1 and Phase 3 data. Future phases should keep treating explainability as a cross-cutting concern, not a separate data domain.
- **`criticAgent.js`** now exists as a hallucination/overreach check — Phase 3's `memoryAgent.js` retroactively should be considered "reviewed by" this agent for any *Hidden Memory* inferences going forward (wire this in as a small follow-up if time allows, but not blocking).

---

# 🟦 PHASE 5 — Privacy System

## Goal
Build PII detection, consent, redaction, and the Privacy Dashboard from `PROJECT.md` §9.

## Depends On
Phase 1 (`Resume` model), Phase 3 (`Memory` model — sensitive type already exists).

## What Gets Built
- PII/sensitive-field detection pipeline.
- Consent model (purpose-scoped).
- Redaction (non-destructive, export-time only).
- Privacy Dashboard.

## Exact Files/Folders Created

| File | Purpose |
|---|---|
| `server/models/Consent.js` | `{ userId, purpose, dataCategory, granted, updatedAt }` |
| `server/models/PrivacyFlag.js` | `{ resumeId, fieldPath, flagType, redacted }` |
| `server/services/piiDetectionService.js` | NER + rule-based scan for age, DOB, marital status, photo, nationality, religion |
| `server/services/redactionService.js` | Produces a redacted copy of resume content for export, without mutating stored `Resume` |
| `server/agents/privacyAgent.js` | Triggers Privacy Prompts on upload/edit; enforces consent checks before any agent uses a data category |
| `server/controllers/privacyController.js` | `getFlags`, `redact`, `exportData`, `deleteDataCategory`, `updateConsent` |
| `server/routes/privacyRoutes.js` | `/api/privacy/flags/:resumeId`, `/api/privacy/redact`, `/api/privacy/export`, `/api/privacy/data/:category`, `/api/privacy/consent` |
| `client/src/components/privacy/ConsentToggle.jsx` | Purpose-scoped consent switch |
| `client/src/components/privacy/RedactionPreview.jsx` | Shows before/after redacted export preview |
| `client/src/components/privacy/PrivacyFlagBanner.jsx` | Inline prompt when PII detected on upload |
| `client/src/pages/PrivacyDashboardPage.jsx` | Full dashboard (§13.8) |
| `client/src/api/privacyApi.js` | Frontend API wrapper |

## Collections Touched
- `consents`, `privacyflags` (also reads `resumes`, `memories`)

## APIs Added
- `GET /api/privacy/flags/:resumeId`
- `POST /api/privacy/redact`
- `GET /api/privacy/export`
- `DELETE /api/privacy/data/:category`
- `POST /api/privacy/consent`

## Definition of Done
- Uploading a resume with a photo/DOB triggers a `PrivacyFlagBanner`.
- User can redact flagged fields before export without affecting the stored resume.
- Privacy Dashboard shows consent toggles per purpose/category and full data export/delete.
- `privacyAgent.js` blocks `memoryAgent.js` (Phase 3) from proposing a Sensitive Memory Card unless the relevant consent purpose is granted.

## 📌 Context Handoff (read this before starting Phase 6)
- **New collections:** `consents`, `privacyflags`.
- **Critical cross-phase wiring:** `memoryAgent.js` (Phase 3) must now call `privacyAgent.js` before proposing any `type: 'sensitive'` Memory Card — if this wiring wasn't done live in Phase 3, do it now as the first task of Phase 5 integration.
- **Redaction is export-time only** — never mutates the canonical `Resume.sections` document. Phase 7 (Export feature) must call `redactionService.js` at export time, not before.
- **Consent purposes already defined:** `'scoring'`, `'chat_memory'`, `'export'` — Phase 6 and Phase 7 should reference these exact string values, not invent new ones.

---

# 🟦 PHASE 6 — Human Approval Workflow (System-Wide)

## Goal
Unify every AI write-action (resume edits, memory, suggestions) behind one consistent approval mechanism, per `PROJECT.md` §10.

## Depends On
Phases 1–5 (this phase wraps/formalizes existing flows, doesn't replace their data models).

## What Gets Built
- Unified `Suggestion` model covering resume edits, skill additions, roadmap items.
- Suggestion review queue UI (`AISuggestionsPage.jsx`).
- Bulk approval with second-confirmation.
- Recommendation Agent + Roadmap feature (Optimizer, Learning Roadmap from §6.5/§6.7).

## Exact Files/Folders Created

| File | Purpose |
|---|---|
| `server/models/Suggestion.js` | `{ resumeId, suggestionType, diff, explanationTrace, status: 'pending'/'accepted'/'rejected', createdAt }` |
| `server/agents/recommendationAgent.js` | Generates optimizer suggestions and roadmap items as `Suggestion` documents (status always starts `'pending'`); **calls `python-service/routers/course_recommender.py` (ported from AdaptIQ) for course links per skill gap** |
| `server/controllers/suggestionController.js` | `listSuggestions`, `approveSuggestion` (applies diff to `Resume`), `rejectSuggestion`, `bulkApprove` |
| `server/routes/suggestionRoutes.js` | `/api/suggestions`, `/api/suggestions/:id/approve`, `/api/suggestions/:id/reject`, `/api/suggestions/bulk-approve` |
| `server/controllers/roadmapController.js` | `getRoadmap`, `generateRoadmap` (linked to originating skill gap) |
| `server/routes/roadmapRoutes.js` | `/api/roadmap/:skillGapId` |
| `client/src/pages/AISuggestionsPage.jsx` | Central review queue (§13.6) |
| `client/src/components/suggestions/SuggestionDiffCard.jsx` | Diff-style accept/reject card |
| `client/src/components/suggestions/BulkApprovalBar.jsx` | Bulk approve with count-confirmation |
| `client/src/hooks/useApprovalQueue.js` | Fetches/manages pending suggestions across the app |
| `client/src/components/resume/RoadmapTimeline.jsx` | Learning roadmap UI (§6.7) |
| `client/src/components/resume/SkillDependencyGraph.jsx` | 🔁 **Ported/adapted from AdaptIQ's `frontend/src/Components/SkillDependencyGraph.jsx`** — prereq→next-step graph, restyled to match our design system and wired to `Suggestion`-linked roadmap items instead of AdaptIQ's standalone state |

## Collections Touched
- `suggestions` (also writes to `resumes` on approval)

## APIs Added
- `GET /api/suggestions`
- `POST /api/suggestions/:id/approve`
- `POST /api/suggestions/:id/reject`
- `POST /api/suggestions/bulk-approve`
- `GET /api/roadmap/:skillGapId`

## Definition of Done
- Every AI-proposed resume edit now appears in `AISuggestionsPage.jsx` as a pending `Suggestion`, never auto-applied.
- Bulk approval requires an explicit second tap showing the count of changes.
- Skill gaps from Phase 1's matching flow can be turned into a `Suggestion`-linked Learning Roadmap, complete with the ported `SkillDependencyGraph` and course links from the ported TF-IDF recommender.
- The earlier "direct write" behavior from Phase 2's Resume Builder is now routed through this same `Suggestion` model.

> **Optional, time-permitting:** AdaptIQ's `DiagnosticQuiz.jsx` + `/generate-quiz` logic can be ported here as an extra Learning Roadmap sub-feature (quiz-tagged skill gaps → roadmap milestones). Not required for a working demo — see Future Scope §22 if it doesn't fit the timeline.

## 📌 Context Handoff (read this before starting Phase 7)
- **New collection:** `suggestions` — this is now the single write-gate for all resume content changes system-wide. **No controller should mutate `Resume.sections` directly except `suggestionController.approveSuggestion`.** If any earlier-phase code (e.g., Phase 2's builder) still writes directly, refactor it now — this is a hard architectural rule going forward.
- **`explanationTrace` is populated on every `Suggestion`** using `evaluatorAgent.js` from Phase 4 — reuse, don't reimplement.
- Phase 7 (Version History, Export, Comparison) can now assume every `Resume` change is traceable to an approved `Suggestion` — use this for version diff summaries.

---

# 🟦 PHASE 7 — Version History, Comparison & Export

## Goal
Build the remaining core features from `PROJECT.md` §6.8–§6.10: Export, Version History, Resume Comparison.

## Depends On
Phase 5 (redaction), Phase 6 (`Suggestion` as the source of change events).

## What Gets Built
- Auto-versioning on every approved change.
- Version timeline + restore.
- Side-by-side comparison view.
- Export with template choice + redaction step.

## Exact Files/Folders Created

| File | Purpose |
|---|---|
| `server/models/ResumeVersion.js` | `{ resumeId, versionNumber, sections, diffSummary, createdAt }` — created automatically inside `suggestionController.approveSuggestion` |
| `server/services/exportService.js` | Renders final PDF/DOCX from `Resume.sections` (post-redaction if selected) — deterministic, no AI involved |
| `server/controllers/resumeController.js` | *(extended)* `getVersions`, `restoreVersion`, `compareVersions`, `exportResume` |
| `server/routes/resumeRoutes.js` | *(extended)* `/api/resumes/:id/versions`, `/api/resumes/:id/versions/:version/restore`, `/api/resumes/:id/compare`, `/api/resumes/:id/export` |
| `client/src/components/resume/VersionTimeline.jsx` | Version history UI (§6.9) |
| `client/src/components/resume/SplitDiffView.jsx` | Side-by-side comparison (§6.10) |
| `client/src/components/common/ExportModal.jsx` | Template picker + redaction toggle before download (§6.8) |
| `client/src/components/common/TemplatePicker.jsx` | Resume template selection |

## Collections Touched
- `resumeversions` (reads `resumes`, `suggestions`, `privacyflags`)

## APIs Added
- `GET /api/resumes/:id/versions`
- `POST /api/resumes/:id/versions/:version/restore`
- `GET /api/resumes/:id/compare?v1=&v2=`
- `POST /api/resumes/:id/export`

## Definition of Done
- Every approved `Suggestion` creates a new `ResumeVersion` automatically.
- User can view version timeline, restore a prior version, and compare two versions side by side.
- Export flow shows redaction preview (Phase 5) before final PDF/DOCX download.

## 📌 Context Handoff (read this before starting Phase 8)
- **New collection:** `resumeversions` — created only via `suggestionController.approveSuggestion` (Phase 6), never manually. Keep this coupling intact.
- **`exportService.js` is intentionally AI-free** — do not route export generation through any LLM agent; this is a deliberate trust/reliability decision from `PROJECT.md` §6.8.
- All core features from the PRD are now implemented. Phase 8 is integration/polish only — no new data models should be needed.

---

# 🟦 PHASE 8 — Integration, Demo Polish & Deployment

## Goal
Tie every phase together into one coherent, demo-ready product; add final UI polish and seed data.

## Depends On
All previous phases.

## What Gets Built
- `DashboardPage.jsx` finalized to surface widgets from every phase (Memory summary, pending Suggestions, recent Matches).
- `SettingsPage.jsx` for default memory timeboxing preference and notification settings.
- Seed script for demo data.
- Deployment configs.

## Exact Files/Folders Created

| File | Purpose |
|---|---|
| `client/src/pages/DashboardPage.jsx` | *(finalized)* pulls in `MemoryDashboardWidget`, pending suggestions count, recent matches |
| `client/src/pages/SettingsPage.jsx` | Default timeboxing preference, notification toggles |
| `server/utils/seedData.js` | Demo users, resumes, memories, suggestions for judge-facing demo |
| `server/config/env.js` | *(finalized)* production env validation |
| `README.md` | Setup instructions (per `PROJECT.md` §25) |
| `.env.example` (client + server) | Documented required environment variables |

## Collections Touched
- All collections (seeding only, no schema changes)

## APIs Added
- None — integration only.

## Definition of Done
- Full user journey from `PROJECT.md` §12 runs end-to-end without manual DB intervention.
- Seed script populates a realistic demo account matching the Section 21 demo flow.
- App is deployable (e.g., Vercel for `client/`, Render/Railway for `server/`, MongoDB Atlas for DB).

## 📌 Context Handoff (post-launch / next team)
- **All 8 phases complete.** Full collection list in production: `users`, `resumes`, `resumeversions`, `jobdescriptions`, `matches`, `memories`, `memoryusagelogs`, `consents`, `privacyflags`, `conversations`, `conversationturns`, `suggestions`.
- **Hard architectural rules to preserve in any future work:**
  1. `memoryAgent.js` only *proposes* — never writes `status: 'accepted'` directly.
  2. `Resume.sections` is only mutated via `suggestionController.approveSuggestion`.
  3. Every user-facing AI output passes through `evaluatorAgent.js` for its `explanationTrace`.
  4. Sensitive Memory proposals require `privacyAgent.js` consent-check first.
  5. `exportService.js` remains AI-free.
- Future features (see `PROJECT.md` §22 Future Scope) should extend these five rules, not bypass them.
