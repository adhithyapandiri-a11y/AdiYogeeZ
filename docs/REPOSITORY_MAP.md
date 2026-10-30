# Interactive repository map

The Architecture Explorer at `/workspace/[id]/architecture` now opens **Repository Map** by default. This ports the graph interaction model developed in the standalone RepoMind prototype into the existing Next.js/FastAPI workspace.

## Behaviour

- Violet diamond folder hubs and small language-coloured file nodes form organic clusters. Edges show **immediate folder containment only**.
- The graph uses `getProjectStructure` from the existing backend, reconstructing any missing ancestor folders from exact indexed paths. It does not make extra GitHub requests or run an additional import pipeline.
- Click a folder hub to expand/collapse. Search or the Explorer list can reveal any indexed path, including files hidden inside collapsed folders. Full paths distinguish duplicate filenames. Search supports Ctrl/⌘ K, arrow keys, Enter and Escape.
- File selection highlights its ancestor chain and opens the existing architecture inspector, including symbols/dependencies and an escaped, line-numbered syntax preview. The full source viewer remains available, with retry states, Escape dismissal and keyboard focus containment.
- Drag the canvas to pan, scroll/pinch to zoom, drag nodes to arrange, and use the zoom/fit/centre controls. The initial force layout runs once per loaded data snapshot. Ordinary selection, hover and folder visibility changes do not rerun it. Search deliberately centres the chosen result. Reduced motion disables camera animation.
- The Explorer becomes a toggleable panel on smaller screens. The inspector fits within the viewport. The workspace's module sidebar is hidden below desktop width so it does not squeeze the graph off-screen; the existing Navbar and architecture mode switcher remain available.
- **Hierarchy** retains the previous React Flow project-structure view. **Dependency Map** and **Feature Flow** remain separate modes backed by their existing APIs.

## Data and performance limits

This map includes **indexed source files**, not every item in the raw GitHub repository. The existing backend filters and indexing cap still apply (currently up to 1,500 candidate source files). Excluded binaries, ignored files, unindexed files and empty directories do not appear. The map does not claim completeness beyond that indexed listing.

The render budget is **300 nodes including the synthetic root**. All indexed items remain in search and the Explorer; the selected path and ancestor folders take priority within the budget. A visible notice reports expanded items outside the budget. Extremely deep paths approaching 300 ancestors are outside the intended navigation limit. Dense labels may require zoom; use search or the file list for precise keyboard navigation.

D3 computes a static layout on the main thread; a large indexed repository can briefly pause during initial layout. Cytoscape owns camera and pointer interactions afterwards. The map resets when switching modes or changing repositories; it is not saved across page reloads.

## Local setup and verification

Follow the root README to start FastAPI (usually port 8000) and the frontend. The map needs no Gemini key. The backend now declares `sqlalchemy[asyncio]` so clean installations include the required `greenlet` dependency.

```sh
cd frontend
npm ci
npm run build
npm run typecheck
npm run dev -- --port 3001
```

For a different API origin, set `NEXT_PUBLIC_API_URL` before starting Next.js, for example `http://localhost:8001/api`.

With the frontend running:

```sh
npm run test:e2e -- --grep-invert @live
```

The browser fixtures are explicitly test-only. Checks cover path adaptation and render limits, the default graph, collapsed-folder search, duplicate paths, safe source rendering, source-viewer keyboard handling, folder controls, zoom/fit, hierarchy fallback, retries, and a 390px viewport. Playwright uses installed Chrome on macOS; elsewhere install its Chromium browser (`npx playwright install chromium`). `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can override the browser path.

An optional live check expects the AdiYogeeZ repository to have completed indexing in FastAPI:

```sh
NEXT_PUBLIC_API_URL=http://localhost:8001/api REPOMIND_LIVE_REPO_ID=1 npm run test:e2e -- --grep @live
```

Actual verification used a temporary SQLite database, real public GitHub ingestion of AdiYogeeZ (56 indexed files), then searched and previewed `frontend/src/app/page.tsx` through the map and full source viewer. Build, TypeScript and the new map's targeted ESLint checks pass. Repository-wide ESLint still reports pre-existing issues in other modules; this contribution does not attempt a whole-repository lint cleanup.

## PRD alignment and credits

This implements the PRD's Architecture Explorer interaction surface with the existing indexed containment API. It does not add inferred runtime edges or satellite symbols without backend evidence. The missing execution-path method, vector indexing upgrades, tarball ingestion and other roadmap modules remain separate work.

The adapted standalone map uses Cytoscape.js, D3 force, Lucide and Highlight.js. Source for the standalone map was MIT licensed; that notice is retained in `frontend/src/components/architecture/repository-map/LICENSE`. The target repository's existing licence remains in place. OpenAI Codex assisted with integration, documentation and tests; imported repository source is never executed by the map.
