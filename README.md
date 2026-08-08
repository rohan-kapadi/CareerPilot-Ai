# 🧭 CareerPilot AI

<div align="center">

<img src="client/public/logo.svg" alt="CareerPilot AI Logo" width="80" />

### *"Not another resume bot. A new interaction model for how humans and AI collaborate on the most personal document of your professional life."*

**CareerPilot AI** is a human-centered AI career copilot built for the ACM SIGCHI Hackathon on Human-Centered Design of Large Language Model Interfaces. It introduces a fundamentally new paradigm: **AI memory as a negotiation, not a silent database.**

<br />

![status](https://img.shields.io/badge/status-hackathon--build-blue)
![track](https://img.shields.io/badge/track-ACM%20SIGCHI%202026-purple)
![stack](https://img.shields.io/badge/stack-MERN%20%2B%20FastAPI-green)
![license](https://img.shields.io/badge/license-MIT-orange)

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Privacy & Explainable AI](#-privacy--explainable-ai)
- [Chrome Extension](#-chrome-extension)
- [License](#-license)

---

## 🎯 Problem Statement

Modern LLM-powered tools for career management operate as opaque black boxes. When a user shares their resume, salary expectations, or job constraints with an AI assistant, they have **no visibility** into:

1. **What the AI actually remembered** from the conversation.
2. **How confident** the AI is in its inferences about them.
3. **How to correct or delete** a specific memory entry.
4. **When sensitive data** (e.g., health constraints, salary bottom-lines) expires.

This leads to hallucinations, privacy risks, and eroding user trust — the opposite of what a career tool should inspire.

---

## 💡 Solution Overview

CareerPilot AI introduces the **Memory Negotiation System** — a first-of-its-kind interaction model where every AI inference is surfaced to the user as a **Memory Card** before being stored.

```
User says:  "I can't travel more than 20% due to a medical constraint."
                        ↓
AI proposes:  ┌──────────────────────────────────────────────┐
              │ 💾 New Memory Proposal                       │
              │ Type:     Sensitive (expires in 90 days)     │
              │ Content:  Has a medical constraint limiting   │
              │           travel to under 20%.               │
              │ Confidence: 95%  · Category: Constraints     │
              │                                              │
              │  [Accept]  [Modify]  [Reject]  [Time-box]   │
              └──────────────────────────────────────────────┘
                        ↓
Only after user clicks [Accept] is anything stored.
```

This puts the user in **complete control** of the AI's understanding of them.

---

## ✨ Key Features

### 🧠 Memory Negotiation System
- Every AI inference is proposed as an explicit **Memory Card** before storage
- Users can **Accept**, **Modify**, **Reject**, or **Time-box** (set expiry) any memory
- A **Memory Type Taxonomy** classifies facts as `session`, `temporary`, `long_term`, `career`, `sensitive`, or `hidden`
- All memories are confidence-scored on a 0–1 float scale

### 📊 Visual Memory Dashboard
- **Hub-and-Spoke Dependency Graph** (D3.js): A force-directed graph visualizing the user's Core Profile as a central hub, with category hubs (Skills, Experience, Goals, etc.) radiating outward, and individual memory nodes as leaves
- **Compact Activity Feed Timeline**: Memories grouped by date into sleek card lists showing type, content, confidence, and source
- **Instant Deletion**: Any accepted memory can be revoked at any time with a single click

### 📄 Intelligent Resume Analysis
- Upload PDF or DOCX resumes for AI-powered structured parsing
- Real-time **ATS (Applicant Tracking System) scoring** against any job description
- Detailed skill gap analysis: what you have, what's missing, and match percentage
- Resume version history and diff tracking

### 💬 Career Chat Assistant
- Persistent, context-aware AI chat powered by the Memory system
- Recalls your skills, preferences, and constraints across sessions
- AI-generated personalized **course recommendations** for skill gaps
- Structured, cited suggestions — never opaque black-box advice

### 📝 Cover Letter & Resume Tailoring
- One-click AI cover letter generation tailored to a specific job description
- Resume section enhancement suggestions with rationale
- Export to DOCX or PDF

### 🔗 Chrome Extension
- Companion browser extension to capture job descriptions from any job board
- Syncs directly with your CareerPilot account for instant analysis

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               React Client (Port 5173)                    │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐  │  │
│  │  │  Career Chat  │  │ Memory Dash   │  │ Resume Viewer │  │  │
│  │  │  (Dual Pane) │  │ (Graph+Feed)  │  │ (ATS Scores)  │  │  │
│  │  └──────────────┘  └───────────────┘  └───────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌─────────────────┐         │                                   │
│  │ Chrome Extension│─────────┘                                   │
│  └─────────────────┘                                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / REST
         ┌─────────────────────▼──────────────────────┐
         │         Node.js / Express Server             │
         │                 (Port 5000)                  │
         │  ┌────────────────────────────────────────┐  │
         │  │ Auth · Resume · Chat · Memory · Export │  │
         │  │ Job · Privacy · Suggestion · Roadmap   │  │
         │  └────────────────────────────────────────┘  │
         │                    │                          │
         │         ┌──────────▼──────────┐               │
         │         │     MongoDB Atlas   │               │
         │         │ Users, Resumes,     │               │
         │         │ Memories, JDs,      │               │
         │         │ Conversations,      │               │
         │         │ Matches             │               │
         │         └─────────────────────┘               │
         └───────────────────┬─────────────────────────┘
                             │ Internal HTTP
         ┌───────────────────▼─────────────────────────┐
         │         Python AI Service (FastAPI)          │
         │                 (Port 8000)                  │
         │  ┌────────────────────────────────────────┐  │
         │  │ /parse  → Resume Parsing (Mistral)     │  │
         │  │ /ats    → ATS Scoring & Skill Gap      │  │
         │  │ /match  → Semantic Job Matching        │  │
         │  │ /tailor → Resume Tailoring             │  │
         │  │ /enhance→ Section Enhancement          │  │
         │  │ /courses→ Course Recommendation        │  │
         │  │ /cover  → Cover Letter Generation      │  │
         │  └────────────────────────────────────────┘  │
         │         ┌──────────────────────┐             │
         │         │  LLM APIs            │             │
         │         │  · Mistral AI        │             │
         │         │  · sentence-trans.   │             │
         │         └──────────────────────┘             │
         └──────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 + Vite | SPA with fast HMR |
| **Styling** | Tailwind CSS + Custom CSS | Utility-first design system |
| **Data Visualization** | D3.js | Memory Hub-and-Spoke Graph |
| **Icons** | Lucide React | Consistent icon set |
| **Backend Framework** | Node.js + Express 5 | REST API & business logic |
| **Database** | MongoDB + Mongoose | Persistent storage |
| **Authentication** | JWT (jsonwebtoken) | Stateless auth |
| **Resume Export** | Docxtemplater + Puppeteer | DOCX & PDF generation |
| **AI / LLM** | Mistral AI API | Chat, scoring, generation |
| **Semantic Search** | sentence-transformers | Skill & job matching |
| **AI Framework** | Python FastAPI | AI microservice |
| **File Parsing** | pdfplumber + python-docx | Resume ingestion |
| **Browser Extension** | Chrome Manifest V3 | Job scraping companion |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `v18+`
- **Python** `v3.10+`
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Mistral AI API Key** → [console.mistral.ai](https://console.mistral.ai/api-keys/)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/careerpilot-ai.git
cd careerpilot-ai
```

---

### 2. Setup the Node.js API Server

```bash
cd server
npm install

# Create your environment file
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, PYTHON_SERVICE_URL (see Environment Variables below)

npm run dev
# Server starts on http://localhost:5000
```

---

### 3. Setup the Python AI Service

```bash
cd python-service

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Create your environment file
cp .env.example .env
# Fill in MISTRAL_API_KEY

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# AI service starts on http://localhost:8000
```

---

### 4. Setup the React Client

```bash
cd client
npm install

npm run dev
# Client starts on http://localhost:5173
```

---

### 5. (Optional) Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** on (top right)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder from this repository
5. Pin the extension from the Chrome toolbar

---

## 🔐 Environment Variables

### `server/.env`

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/careerpilot
JWT_SECRET=your_strong_jwt_secret_here
PYTHON_SERVICE_URL=http://localhost:8000
CLIENT_URL=http://localhost:5173
```

### `python-service/.env`

```env
MISTRAL_API_KEY=your_mistral_api_key_here
UPLOADS_DIR=../server/uploads
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |

### Resume

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/resume/upload` | Upload PDF/DOCX → AI parsing |
| `GET` | `/api/resume/:id` | Fetch parsed resume JSON |
| `PUT` | `/api/resume/:id/sections` | Update resume sections |
| `GET` | `/api/resume/:id/versions` | List version history |

### Job & ATS Scoring

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/job/analyze` | Analyze a JD → ATS score + skill gap |
| `GET` | `/api/jd/:id` | Retrieve a saved job description |

### Memory (Core Innovation)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/memory` | Fetch all memories for the authenticated user |
| `POST` | `/api/memory/:id/decide` | Accept / Modify / Reject / Time-box a proposal |
| `DELETE` | `/api/memory/:id` | Permanently forget a specific memory |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/message` | Send a message and get an AI response |
| `GET` | `/api/chat/conversations` | List all past conversations |

### Export & Privacy

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/export/:id/docx` | Export resume as DOCX |
| `POST` | `/api/export/:id/pdf` | Export resume as PDF |
| `GET` | `/api/privacy/export` | Export all personal data (GDPR) |
| `DELETE` | `/api/privacy/purge` | Delete all user data |

---

## 🔒 Privacy & Explainable AI

CareerPilot AI was designed from the ground up to align with **GDPR** and the **EU AI Act** principles.

| Principle | Implementation |
|---|---|
| **Transparency** | Every AI inference is surfaced as a Memory Card before storage. |
| **User Control** | Users can modify or delete any single memory fact at any time. |
| **Explainability** | ATS scores are broken down by matched skill, missing skill, and confidence %. |
| **Data Minimization** | Sensitive memories (type: `sensitive`) auto-expire after 90 days unless renewed. |
| **Right to be Forgotten** | One-click full account data purge via the Privacy Dashboard. |
| **PII Redaction** | PDF exports support field-level PII redaction before any file leaves the app. |

---

## 🧩 Memory Type Taxonomy

The memory system uses a strict taxonomy (not just a chat log) to classify what the AI knows:

| Type | Lifetime | Example |
|---|---|---|
| `session` | Current session only | "Looking at ML roles right now" |
| `temporary` | 7–30 days | "Prefers remote for next 3 months" |
| `long_term` | Until revoked | "Has 4 years of React experience" |
| `career` | Until revoked | "Target role: Senior Engineer" |
| `sensitive` | 90 days (renewable) | "Medical travel constraint < 20%" |
| `hidden` | Until surfaced | AI-inferred goal not yet confirmed |

---

## 📁 Project Structure

```
careerpilot-ai/
├── client/                    # React 18 frontend
│   ├── public/                # Static assets (logo.svg, extension zip)
│   └── src/
│       ├── api/               # API client functions
│       ├── components/
│       │   ├── chat/          # Chat thread components
│       │   ├── common/        # Shared UI (ExportModal, etc.)
│       │   ├── layout/        # Navbar, FloatingExtensionButton
│       │   ├── memory/        # MemoryGraph (D3), MemoryTimeline
│       │   └── privacy/       # Redaction preview
│       ├── context/           # React contexts (Auth, Memory)
│       ├── pages/             # Route-level page components
│       └── index.css          # Global design system
│
├── server/                    # Express API server
│   └── src/
│       ├── controllers/       # Route handlers (12 controllers)
│       ├── middleware/         # Auth guard, error handling
│       ├── models/            # Mongoose schemas
│       ├── routes/            # Express routers
│       ├── services/          # Business logic layer
│       └── utils/             # memoryClassifier, helpers
│
├── python-service/            # FastAPI AI microservice
│   ├── routers/               # Endpoints (ats, parse, skills, courses…)
│   ├── services/              # job_intelligence_service, etc.
│   └── main.py                # FastAPI app entry point
│
├── chrome-extension/          # Browser companion extension
│   └── manifest.json
│
├── CareerPilot_Design_Document.docx  # ACM SIGCHI Design Document
└── README.md
```

---

<div align="center">

*CareerPilot AI — Your career, your data, your control.*

</div>