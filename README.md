# RepoMind

> **"Understand any codebase. Navigate any complexity."**

RepoMind is an intelligent codebase exploration and open-source contribution platform. It allows developers to connect any public GitHub repository and interact with its source code through AI-powered analysis, an Obsidian-style visual architecture exploration graph, function relationship mapping, commit history analysis, and contribution assistance.

---

## 🌟 Key Features & Modules

### 1. Repository Connection & Live 8-Stage Indexing Pipeline
* Connect any public GitHub repository (e.g., `expressjs/express` or `https://github.com/facebook/react`).
* Real-time indexing progress tracker:
  1. Connecting to GitHub API & validating public access
  2. Retrieving repository file tree & directory hierarchy
  3. Language identification & source asset filtering
  4. Parsing source code with Tree-sitter & AST engines
  5. Extracting functions, methods, classes, and interfaces
  6. Constructing cross-file dependency relationships & call sites
  7. Generating 768-dimensional vector code embeddings via Gemini
  8. Finalizing intelligence database and index

### 2. Main Dashboard & Codebase Overview
* Comprehensive repository statistics: file counts, detected functions, detected classes, language breakdown, and internal dependency links.
* Recent commit timeline and suggested architectural questions.
* Quick-launch cards into all intelligence modules.
* Instant multi-repository switcher dropdown.

### 3. Module One: RepoMind Grounded AI
* Natural-language conversational interface grounded strictly in indexed codebase excerpts.
* **Evidence Grounding**: All answers cite exact file paths and line ranges (e.g., `[src/auth.ts:24-48]`).
* Clickable citation badges that open the file directly in the embedded code viewer.
* Honest uncertainty: If repository evidence is insufficient, it explicitly states so rather than hallucinating.

### 4. Module Two: Architecture Explorer (Obsidian Constellation + React Flow)
* **Obsidian-Style Constellation Graph View**:
  * Force-directed physics canvas floating in space (`#090d16`).
  * **Directory Hubs**: Large glowing violet circles holding child modules together.
  * **File Nodes**: Sized dynamically by connectivity (in-degree + out-degree) and colored by programming language.
  * **Satellite Dots**: Orbiting function and class symbols.
  * **Focus Highlighting**: Hovering over any node illuminates its connections and smoothly dims unrelated nodes (the classic Obsidian focus effect).
  * Interactive pan, zoom, camera fly-to search, and language filters.
* **Hierarchical Architecture Flow**:
  * React Flow DAG categorizing components across system tiers (UI → API → Services → Models → Utils).
* **Click-to-Inspect Drawer**:
  * Detailed metadata, detected symbols, incoming/outgoing dependencies, and embedded code preview.

### 5. Module Three: Execution Path Explorer
* Autocomplete search for functions and methods across the entire repository.
* Traces incoming **Callers** (upstream invocations) and downstream **Callees** (internal function calls).
* Visual sequential call chain: `Caller Layer → Target Function → Callee Layer → Downstream Services`.
* Click any step in the flow to inspect the exact source code.
* Transparent static analysis disclaimer distinguishing static symbol calls from dynamic runtime execution.

### 6. Module Four: Codebase Time Machine
* Interactive GitHub commit history with author avatars, messages, and timestamps.
* Real commit diff inspector displaying additions (`+`), deletions (`-`), and patch lines.
* **AI Explain Commit**: One-click Gemini breakdown explaining the architectural purpose of the change, key modifications, and regression watchouts.

### 7. Module Five: Contribution Assistant
* Fetches live open GitHub issues directly from the repository.
* Custom feature or bug inquiry mode.
* **Beginner-Friendly Mode Toggle**: Adjusts explanation complexity for first-time open-source contributors vs senior engineers.
* Generates an actionable contribution roadmap:
  - Issue summary & technical problem cause
  - Target files to inspect and modify (with specific reasons)
  - Step-by-step investigation procedures
  - Implementation strategy
  - Comprehensive testing checklist
  - Potential regression risks

### 8. Module Six: Impact Analyzer
* Input any proposed code change (e.g., *"I want to refactor the authentication middleware"*).
* Statically computes dependency blast radius using graph traversal:
  - **HIGH IMPACT**: Direct targets and immediate callers.
  - **MEDIUM IMPACT**: Transitive 2nd-degree dependent files.
  - **LOW IMPACT**: Peripheral configs, documentation, and test suites.
* Explains why each file was flagged and provides a recommended test plan.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, `@xyflow/react` (React Flow), D3-Force Canvas |
| **Backend** | Python 3.12+, FastAPI, Uvicorn, SQLAlchemy (Async), aiosqlite, NetworkX, HTTPX |
| **Code Parsing** | Multi-Language AST Parser, Tree-sitter, Regex Tokenizers |
| **AI & Embeddings** | Google Gemini 2.5 Flash (`gemini-2.5-flash`), Gemini Embeddings (`models/gemini-embedding-001`), Hybrid Vector + BM25 Search |
| **Database** | SQLite with Async I/O (easily upgradeable to PostgreSQL) |

---

## 🚀 Getting Started

### Prerequisites
* Node.js v18+ and npm
* Python 3.10+
* Google Gemini API Key
* GitHub Personal Access Token (for 5,000 requests/hr rate limit)

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
