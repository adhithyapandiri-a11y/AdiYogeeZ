# RepoMind homepage and Neural Map

The homepage and new default Neural Map use the approved neutral charcoal / warm ivory palette: background `#101010`, panels `#191919`, borders `#333333`, text and primary actions `#E8E4D3`, secondary text `#AAA79D`. There is no green accent.

## Existing integration

- The homepage submits to the existing `POST /api/repos/connect`, polls `GET /api/repos/:id`, displays the indexer's status and progress, and opens `/workspace/:id/architecture` on completion.
- The Neural Map consumes the existing `/api/architecture/obsidian/:id` response. It derives directory containment from actual paths and only includes dependency relationships returned by that endpoint. Symbol satellites are omitted to keep the file/folder map readable.
- File selection opens the existing file inspector and code viewer. The AI link opens the existing chat route; no AI provider or backend implementation changes are included.
- Obsidian Cosmos, Hierarchy, Dependency Map, Feature Flow, and the other workspace tools remain available.

## Interaction

Drag to orbit, scroll to zoom, click a node to inspect it. Right-click a folder or use its detail action to collapse it. The file explorer also exposes keyboard-operable folder controls, file search, and selection. Camera buttons provide zoom, reset, and fullscreen. Node and relationship filters separate files, folders, hierarchy, and detected dependencies.

Rendering is limited to 350 nodes, with the selected path and its ancestry prioritized. The complete indexed tree remains searchable. Folder collapse reduces graph density. An unavailable WebGL context leaves the file explorer usable. Reduced-motion preferences disable camera transitions and settle the force layout without continuous simulation.

## Homepage preview

`frontend/src/components/neural/preview.json` is a static source snapshot from repository commit `31ffca4`. Its nodes come from tracked frontend and backend source paths. Dependency edges resolve literal local TypeScript imports (`@/` and relative imports); external imports and Python dependencies are not inferred. It is labeled as a preview and is never used for a connected repository.

## Local checks

Run from `frontend`:

```sh
npm install
npm run dev -- --port 3015
npm run typecheck
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3015 npm run test:e2e -- tests/neural-map.spec.ts
npm run build
```

If this host's Turbopack worker cannot bind a local processing port, `npm run build -- --webpack` can validate production compilation. The existing repo-wide lint command reports errors in older modules; targeted lint checks cover the new feature files. Browser tests use intercepted API responses, so they do not validate a deployed backend, GitHub credentials, or AI responses.
