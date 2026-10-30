"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderTree,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  X,
} from "lucide-react";
import { getProjectStructure } from "@/lib/api";
import type { ProjectStructureResponse, Repository } from "@/lib/types";
import { MapSearch } from "./repository-map/MapSearch";
import { toMapRepository } from "./repository-map/adapter";
import {
  type Entry,
  ROOT,
  ancestors,
  colour,
  visibleEntries,
} from "./repository-map/model";

const RepositoryGraph = dynamic(
  () => import("./repository-map/RepositoryGraph").then((m) => m.Graph),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="flex h-full items-center justify-center text-xs text-slate-400"
      >
        Preparing repository map…
      </div>
    ),
  },
);
interface Props {
  repoId: number;
  repository: Repository | null;
  selectedFilePath: string | null;
  onSelectFile: (path: string | null) => void;
}
export function RepositoryMapView(props: Props) {
  return <MapWorkspace key={props.repoId} {...props} />;
}
function MapWorkspace({
  repoId,
  repository,
  selectedFilePath,
  onSelectFile,
}: Props) {
  const [data, setData] = useState<ProjectStructureResponse>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    getProjectStructure(repoId)
      .then((result) => {
        if (current) {
          setData(result);
          setError("");
        }
      })
      .catch((error) => {
        if (current)
          setError(
            error instanceof Error
              ? error.message
              : "Could not load repository map.",
          );
      });
    return () => {
      current = false;
    };
  }, [repoId, retry]);
  const repo = useMemo(
    () => (data ? toMapRepository(data, repoId, repository) : undefined),
    [data, repoId, repository],
  );
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [folder, setFolder] = useState<string>();
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerHidden, setExplorerHidden] = useState(false);
  const [focus, setFocus] = useState<{ path: string; sequence: number }>();
  const selected = selectedFilePath || folder;
  const effectiveExpanded = useMemo(
    () =>
      new Set([
        ...(expanded || [
          ROOT,
          ...(repo?.entries
            .filter((e) => e.kind === "folder" && e.path.split("/").length < 3)
            .map((e) => e.path) || []),
        ]),
        ...(selected ? ancestors(selected) : []),
      ]),
    [expanded, selected, repo],
  );
  const visible = useMemo(
    () =>
      repo
        ? visibleEntries(repo.entries, effectiveExpanded, selected)
        : { entries: [], hidden: 0 },
    [repo, effectiveExpanded, selected],
  );
  const children = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of repo?.entries || []) {
      const group = map.get(entry.parent) || [];
      group.push(entry);
      map.set(entry.parent, group);
    }
    for (const group of map.values())
      group.sort(
        (a, b) =>
          Number(b.kind === "folder") - Number(a.kind === "folder") ||
          a.name.localeCompare(b.name),
      );
    return map;
  }, [repo]);
  const select = (path: string) => {
    const entry = repo?.entries.find((e) => e.path === path);
    if (entry?.kind === "folder") {
      setFolder(path);
      onSelectFile(null);
    } else {
      setFolder(undefined);
      onSelectFile(path);
    }
  };
  const reveal = (path: string) => {
    select(path);
    setExpanded(
      (previous) =>
        new Set([...(previous || effectiveExpanded), ...ancestors(path)]),
    );
    setFocus({ path, sequence: Date.now() });
    setExplorerOpen(false);
  };
  const toggle = (path: string) =>
    setExpanded((previous) => {
      const next = new Set(previous || effectiveExpanded);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  const tree = (parent: string, depth = 0): ReactNode =>
    children.get(parent)?.map((entry) => (
      <div key={entry.path}>
        <div
          className={`flex min-h-8 items-center pr-2 text-xs ${selected === entry.path ? "bg-violet-500/15 text-violet-200" : "text-slate-300 hover:bg-slate-800/50"}`}
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          {entry.kind === "folder" ? (
            <button
              aria-label={`${effectiveExpanded.has(entry.path) ? "Collapse" : "Expand"} ${entry.path}`}
              aria-expanded={effectiveExpanded.has(entry.path)}
              className="flex h-8 w-6 shrink-0 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-violet-400"
              onClick={() => {
                select(entry.path);
                toggle(entry.path);
              }}
            >
              {effectiveExpanded.has(entry.path) ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          )}
          <button
            className="flex min-w-0 flex-1 items-center gap-2 rounded py-2 text-left focus-visible:outline-2 focus-visible:outline-violet-400"
            title={entry.path}
            aria-current={selected === entry.path ? "true" : undefined}
            onClick={() => reveal(entry.path)}
          >
            {entry.kind === "folder" ? (
              <Folder size={14} style={{ color: colour(entry) }} />
            ) : (
              <FileCode2 size={14} style={{ color: colour(entry) }} />
            )}
            <span className="truncate">{entry.name}</span>
          </button>
        </div>
        {entry.kind === "folder" &&
          effectiveExpanded.has(entry.path) &&
          tree(entry.path, depth + 1)}
      </div>
    ));
  if (error)
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-sm text-slate-300"
      >
        <AlertCircle className="text-rose-400" />
        <p>{error}</p>
        <button
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-violet-400"
          onClick={() => {
            setError("");
            setRetry((n) => n + 1);
          }}
        >
          <RefreshCw size={15} />
          Retry map
        </button>
      </div>
    );
  if (!repo)
    return (
      <div
        role="status"
        className="flex h-full items-center justify-center text-xs text-slate-400"
      >
        Loading indexed repository structure…
      </div>
    );
  if (!repo.entries.length)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <FolderTree className="text-violet-400" />
        <h2 className="text-sm font-medium text-slate-200">
          No indexed files yet
        </h2>
        <p className="max-w-sm text-xs leading-6 text-slate-400">
          Wait for repository indexing to finish, then refresh the map. Only
          indexed source files are included.
        </p>
        <button
          onClick={() => setRetry((n) => n + 1)}
          className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800"
        >
          Refresh map
        </button>
      </div>
    );
  return (
    <section
      aria-label="Repository map"
      className="relative flex h-full min-w-0 flex-col overflow-hidden bg-[#090d16]"
    >
      <div className="z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-slate-800 bg-[#0c121e] px-3 py-2">
        <button
          aria-label="Show map explorer"
          className="rounded p-2 text-slate-400 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-violet-400"
          onClick={() => {
            setExplorerHidden(false);
            setExplorerOpen(true);
          }}
        >
          <PanelLeftOpen size={17} />
        </button>
        <MapSearch entries={repo.entries} onSelect={reveal} />
        <span className="hidden min-w-0 items-center gap-2 text-xs text-slate-400 lg:flex">
          <GitBranch size={13} />
          <span className="truncate">
            {repo.name}
            {repo.branch && ` / ${repo.branch}`}
          </span>
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1">
        <aside
          aria-label="Map explorer"
          className={`${explorerOpen ? "absolute inset-y-0 left-0 z-30 flex shadow-2xl" : "hidden"} ${explorerHidden ? "" : "md:relative md:flex"} w-56 shrink-0 flex-col border-r border-slate-800 bg-[#0c121e]`}
        >
          <div className="flex h-12 shrink-0 items-center justify-between px-3 text-[10px] tracking-wider text-slate-400">
            <span>INDEXED FILES</span>
            <button
              aria-label="Hide map explorer"
              className="rounded p-2 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-violet-400"
              onClick={() => {
                setExplorerOpen(false);
                setExplorerHidden(true);
              }}
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
          <div className="flex justify-between border-b border-slate-800 px-3 pb-2 text-[11px] text-slate-400">
            <span>
              {repo.entries.filter((e) => e.kind === "file").length} indexed
              files
            </span>
            <button
              className="rounded px-1 text-violet-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-violet-400"
              onClick={() => {
                setExpanded(new Set([ROOT]));
                setFolder(undefined);
                onSelectFile(null);
              }}
            >
              Collapse all
            </button>
          </div>
          <nav
            aria-label="Map files"
            className="min-h-0 flex-1 overflow-auto py-2"
          >
            {tree(ROOT)}
          </nav>
          <p className="border-t border-slate-800 p-3 text-[10px] leading-5 text-slate-500">
            All indexed paths remain searchable, including collapsed folders.
          </p>
        </aside>
        <div className="relative min-w-0 flex-1">
          <RepositoryGraph
            repo={repo}
            visible={visible.entries}
            selected={selected}
            expanded={effectiveExpanded}
            onSelect={select}
            onToggle={toggle}
            focus={focus}
          />
          <div className="pointer-events-none absolute bottom-5 left-4 hidden items-center gap-3 text-[10px] text-slate-400 lg:flex">
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 rotate-45 rounded-sm bg-violet-400" />
              Folder hub
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              File · colour by language
            </span>
          </div>
        </div>
        {folder && (
          <div className="absolute right-4 top-4 z-10 w-56 max-w-[calc(100%-2rem)] rounded-lg border border-slate-700 bg-[#0c121e] p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <Folder size={18} className="text-violet-400" />
              <button
                aria-label="Close folder details"
                className="rounded p-1 text-slate-400 hover:bg-slate-800"
                onClick={() => setFolder(undefined)}
              >
                <X size={14} />
              </button>
            </div>
            <h2 className="mt-3 truncate text-sm font-medium text-slate-200">
              {folder.split("/").pop()}
            </h2>
            <p className="mt-1 break-all text-[11px] text-slate-400">
              {folder}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              {children.get(folder)?.length || 0} direct indexed items
            </p>
          </div>
        )}
      </div>
      <footer
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-3 py-2 text-[10px] text-slate-400"
        role="status"
      >
        <span>
          {visible.entries.length + 1} visible nodes · {repo.entries.length}{" "}
          indexed files and folders
        </span>
        <span>Folder containment · Drag to pan · Scroll to zoom</span>
        {visible.hidden > 0 && (
          <span className="w-full text-amber-300">
            {visible.hidden} expanded items exceed the 300-node view limit.
            Search can reveal any indexed path.
          </span>
        )}
      </footer>
    </section>
  );
}
