# RepoMind 🧠⚡

> **"Understand any codebase. Navigate any complexity."**
> 
> *A next-generation codebase intelligence platform featuring a 3D WebGL Obsidian Cosmos, 30-Second Automated Architectural Walkthrough, Grounded AST Reasoning, Static Call-Graph Tracing, and Blast Radius Estimation.*

[![Next.js](https://img.shields.io/badge/Next.js-16_Turbopack-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Three.js](https://img.shields.io/badge/Three.js-3D_WebGL-black?style=flat&logo=three.js)](https://threejs.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=flat&logo=google)](https://ai.google.dev/)
[![Design System](https://img.shields.io/badge/Design_System-VSK_Design-f54e26?style=flat)](https://vsk.design/)

---

## 🏆 Hackathon Quick Links & Demo Walkthrough

RepoMind comes pre-indexed with flagship open-source repositories for instant, one-click demo evaluation:

1. **`adhithyapandiri-a11y/AdiYogeeZ`** — *RepoMind exploring its own codebase in 3D WebGL!*
2. **`expressjs/express`** (69.5k ⭐) — Fast, unopinionated web framework for Node.js.
3. **`vasturiano/react-force-graph`** (3.3k ⭐) — 2D/3D WebGL force-directed graph component.
4. **`adhithyapandiri-a11y/getHalt`** — Android Kotlin digital wellness application with NFC encryption.

---

## 🌟 Key Features & Specialized Intelligence Modules

### 1. 🌌 3D Obsidian Cosmos & 30-Second Guided Architectural Tour
* **3D WebGL Force-Directed Cosmos** powered by `react-force-graph-3d` and Three.js SpriteText billboard labels.
* **Cinematic 30-Second Guided Tour**:
  - Automatically analyzes AST graph nodes to construct an automated 5-stage walkthrough.
  - Stage 1: Entrypoint & Bootstrappers → Stage 2: Dispatch & Routing → Stage 3: Domain Logic → Stage 4: Persistence & Data Models → Stage 5: Full 3D Cosmos Zoom-Out.
  - Smooth camera flight interpolation with floating storyteller progress bar, player controls (Pause, Resume, Next, Prev), and unobstructed view.
* **3-Mode Architecture Explorer**:
  - **Obsidian Cosmos**: 3D force-directed interactive galaxy.
  - **Repository Map**: 2D pannable/zoomable directory containment map with path search.
  - **Hierarchy**: GitDiagram system flowchart and layer organization.

### 2. 💬 RepoMind Grounded AI (Zero Hallucinations)
* Conversational codebase intelligence strictly grounded in parsed AST code excerpts.
* **Verified Citations**: Every claim cites verified file paths and exact line ranges (e.g., `[src/auth.ts:24-48]`).
* Clickable citation badges open the file directly in the embedded high-contrast code viewer and scroll to the exact lines.
* Preset one-click prompt pills for instant exploration: Architecture Overview, Key Entry Points, Auth Workflows, and Database Schemas.

### 3. 🌿 Inter-Function Execution Path Explorer
* Multi-hop function caller and callee graph traversal.
* Sequential call chains: `Callers → Target Symbol → Callees → Downstream Handlers`.
* Click any step in the flow to inspect the exact source code lines.

### 4. ⏳ Codebase Time Machine
* Interactive GitHub commit timeline with author details, timestamps, and commit hashes.
* Full diff inspector displaying additions (`+`), deletions (`-`), and patch lines.
* **AI Commit Breakdown**: One-click Gemini explanation breaking down architectural intent, modifications, and regression watchouts.

### 5. 🎯 Open-Source Contribution Assistant
* Analyzes live GitHub issues and formulates step-by-step contribution roadmaps.
* **AST Isolation Score**: Evaluates if a file is a safe leaf node or a high-risk hub before beginners start editing.
* **Draft Git Patch**: Auto-generates starter code patches to accelerate bug fixes.
* **Beginner-Friendly Mode Toggle**: Adjusts explanation complexity for novice contributors vs senior engineers.

### 6. 🛡️ Impact Analyzer (Static Blast Radius Estimation)
* Predicts regression risks before touching source code.
* Categorizes files into **High**, **Medium**, and **Low** impact tiers based on graph traversal of callers and dependencies.
* Delivers recommended test plans and critical watchouts.

---

## 🎨 Editorial VSK Design System

RepoMind features an editorial visual design inspired by [VSK Design](https://vsk.design/):
* High-contrast dark foundation (`#0d0d0d`, `#141414`, `#181818`) with safety orange `#f54e26`, amber `#f9bf28`, and emerald `#00a86b`.
* Subtle technical dot matrix grid backgrounds and animated marquee ticker ribbons.
* Bento grid layouts with micro-interactions, spring-physics hover animations, and tab-focus indicators (`⚡ Bet that tab isn't as cool.`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router + Turbopack), React 19, TypeScript, Tailwind CSS, Three.js, `react-force-graph-3d`, Three-SpriteText, `@xyflow/react` |
| **Backend** | Python 3.12+, FastAPI, Uvicorn, SQLAlchemy (Async), aiosqlite, NetworkX, HTTPX |
| **Code Parsing** | Multi-Language AST Parser, Tree-sitter, Regex Tokenizers |
| **AI & Embeddings** | Google Gemini 2.5 Flash (`gemini-2.5-flash`), Gemini Embeddings (`models/gemini-embedding-001`), Hybrid Vector + BM25 Search |
| **Database** | SQLite with Async I/O |

---

## 🚀 Quickstart Guide

### 1. Clone & Set Up Environment Variables
Create `backend/.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_token_here
DATABASE_URL=sqlite+aiosqlite:///./repomind.db
PORT=8000
```

### 2. Backend Server
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
* API Server: `http://localhost:8000`
* Interactive API Docs: `http://localhost:8000/docs`

### 3. Frontend Web App
```bash
cd frontend
npm install
npm run dev
```
* Web App: `http://localhost:3000`

### 1. Clone & Set Up Environment Variables
Create `backend/.env` with your credentials:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_personal_access_token_here
DATABASE_URL=sqlite+aiosqlite:///./repomind.db
PORT=8000
```

### 2. Backend Setup
```bash
# In the root repository directory
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Start the FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
* Backend API runs at: `http://localhost:8000`
* Swagger API Docs available at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
* Frontend SaaS UI runs at: `http://localhost:3000`

---

## 🔒 Security & Untrusted Code Guardrails

RepoMind analyzes source code without executing untrusted scripts:
1. **Zero Execution**: Code is parsed strictly via static AST and token analysis. No shell commands or code files from repositories are ever executed.
2. **Path Traversal Shield**: File path sanitization prevents directory traversal attacks (`../`).
3. **Sensitive File Filtering**: `.env`, private keys (`.pem`, `.key`), credentials, and build caches (`node_modules/`, `.git/`) are stripped during ingestion.
4. **Prompt Injection Boundary**: Repository content injected into LLM context is strictly isolated in delimited source blocks to prevent prompt override attacks.

---

## 📖 API Documentation Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/repos/connect` | Connect and trigger 8-stage indexing for a GitHub repo |
| `GET` | `/api/repos` | List all connected repositories |
| `GET` | `/api/repos/{id}` | Get repository metadata and live indexing progress |
| `GET` | `/api/repos/{id}/files` | List repository source files |
| `GET` | `/api/repos/{id}/file-content` | Retrieve raw source code with detected symbols |
| `POST` | `/api/chat/query` | Grounded RAG conversational codebase Q&A |
| `GET` | `/api/architecture/obsidian/{id}` | Get Obsidian-style constellation graph data |
| `GET` | `/api/architecture/flow/{id}` | Get React Flow hierarchical DAG layout |
| `GET` | `/api/architecture/node-details/{id}` | Inspect file dependencies and functions |
| `GET` | `/api/execution-path/trace/{id}` | Trace caller-callee call chain for a function |
| `GET` | `/api/time-machine/commits/{id}` | List Git commit timeline |
| `GET` | `/api/time-machine/details/{id}` | Get commit file additions, deletions, and diff patch |
| `POST` | `/api/time-machine/explain` | AI architectural explanation of commit diff |
| `GET` | `/api/contribution/issues/{id}` | List open GitHub issues |
| `POST` | `/api/contribution/roadmap` | Formulate step-by-step contribution roadmap |
| `POST` | `/api/impact/analyze` | Calculate dependency blast radius for proposed change |

---

## ⚡ Demonstration Workflow

1. Navigate to `http://localhost:3000`.
2. Click **"Explore a Repository"** or select one of the suggested projects (e.g. `expressjs/express`).
3. Watch the real-time **8-stage progress tracker** index the codebase.
4. On the **Overview Dashboard**, inspect file counts, functions, classes, and dependencies.
5. Open the **Architecture Explorer**:
   - Interact with the **Obsidian Constellation Graph**: drag directory hubs, hover over files to view dependency connections, and search for specific modules.
   - Click any node to slide open the **Inspector Panel** and examine detected functions and dependencies.
   - Click **"Open in Full Code Viewer"** to inspect syntax-highlighted code.
6. Open **RepoMind AI**:
   - Ask: *"Explain how middleware execution works in this repository."*
   - Observe grounded citations: click on any `[path:line-range]` badge to view the exact code lines.
7. Open **Execution Path Explorer**:
   - Search for a function like `error` or `handle` to view the call-chain: `Callers → Target → Callees`.
8. Open **Codebase Time Machine**:
   - Select a commit, inspect the file diffs, and click **"Explain This Commit"** for an AI breakdown.
9. Open **Contribution Assistant**:
   - Pick an issue, toggle Beginner Mode, and view the customized investigation steps, target files, and checklist.
10. Open **Impact Analyzer**:
    - Enter a proposed change (e.g. *"Change request routing and header parsing"*) to calculate the blast radius across High, Medium, and Low impact tiers.

## Interactive repository map

Architecture Explorer now opens a graph-first **Repository Map**, with collapsible folders, keyboard path search, a file-list alternative and the existing source inspector. The former project-structure diagram remains available as **Hierarchy**; dependency and feature-flow views stay separate. See [map behaviour, indexed-data limits and verification](docs/REPOSITORY_MAP.md).
