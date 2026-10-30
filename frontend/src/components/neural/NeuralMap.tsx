"use client";
import { useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  GitBranch,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  MessageSquareCode,
} from "lucide-react";
import type { ObsidianGraphData } from "@/lib/types";
import {
  parentPath,
  prepareGraph,
  visibleGraph,
  type NeuralNode,
} from "./model";
const Canvas = dynamic(() => import("./NeuralCanvas"), {
  ssr: false,
  loading: () => (
    <div className="neural-empty" role="status">
      Preparing 3D visualization…
    </div>
  ),
});
interface Props {
  data: ObsidianGraphData;
  name?: string;
  repoId?: number;
  selectedFilePath?: string | null;
  onSelectFile?: (path: string | null) => void;
  preview?: boolean;
}
export default function NeuralMap({
  data,
  name = "Repository",
  repoId,
  selectedFilePath,
  onSelectFile,
  preview = false,
}: Props) {
  const graph = useMemo(() => prepareGraph(data), [data]);
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [explorer, setExplorer] = useState(true);
  const [kind, setKind] = useState("all");
  const [relationships, setRelationships] = useState("all");
  const [focus, setFocus] = useState(0);
  const selected = selectedFilePath ?? localSelected;
  const effectiveCollapsed = useMemo(
    () => new Set([...collapsed].filter((p) => !selected?.startsWith(`${p}/`))),
    [collapsed, selected],
  );
  const view = useMemo(
    () =>
      visibleGraph(graph, effectiveCollapsed, selected, kind, relationships),
    [graph, effectiveCollapsed, selected, kind, relationships],
  );
  const matches = useMemo(
    () =>
      graph.nodes
        .filter((n) => n.path.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 60),
    [graph, query],
  );
  const selectedNode = graph.nodes.find((n) => n.path === selected);
  function select(node: NeuralNode) {
    if (kind !== "all" && kind !== node.type) setKind("all");
    setLocalSelected(node.type === "file" && onSelectFile ? null : node.path);
    setFocus((n) => n + 1);
    if (node.type === "file") onSelectFile?.(node.path);
    else onSelectFile?.(null);
  }
  function toggle(path: string) {
    if (selected?.startsWith(`${path}/`)) {
      setLocalSelected(null);
      onSelectFile?.(null);
    }
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }
  const children = useMemo(() => {
    const groups = new Map<string, NeuralNode[]>();
    for (const n of graph.nodes) {
      const key = parentPath(n.path);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }
    for (const nodes of groups.values())
      nodes.sort(
        (a, b) =>
          Number(b.type === "directory") - Number(a.type === "directory") ||
          a.name.localeCompare(b.name),
      );
    return groups;
  }, [graph]);
  const row = (node: NeuralNode, depth: number) => (
    <div
      className={`neural-tree-row ${selected === node.path ? "is-selected" : ""}`}
      style={{ paddingLeft: 10 + depth * 13 }}
    >
      {node.type === "directory" ? (
        <button
          className="tree-toggle"
          aria-label={`${effectiveCollapsed.has(node.path) ? "Expand" : "Collapse"} ${node.path}`}
          aria-expanded={!effectiveCollapsed.has(node.path)}
          onClick={() => toggle(node.path)}
        >
          {effectiveCollapsed.has(node.path) ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronDown size={12} />
          )}
        </button>
      ) : (
        <span className="tree-toggle" />
      )}
      <button
        title={node.path}
        aria-current={selected === node.path ? "true" : undefined}
        onClick={() => select(node)}
      >
        {node.type === "directory" ? (
          <Folder size={14} />
        ) : (
          <FileCode2 size={13} />
        )}
        <span>{query ? node.path : node.name}</span>
      </button>
    </div>
  );
  function tree(path: string, depth = 0): ReactNode {
    return children.get(path)?.map((n) => (
      <div key={n.id}>
        {row(n, depth)}
        {n.type === "directory" &&
          !effectiveCollapsed.has(n.path) &&
          tree(n.path, depth + 1)}
      </div>
    ));
  }
  return (
    <section
      className={`neural-map ${preview ? "neural-preview" : ""}`}
      aria-label="Neural Map"
    >
      <div className="neural-toolbar">
        <button
          aria-label={explorer ? "Hide file explorer" : "Show file explorer"}
          onClick={() => setExplorer((v) => !v)}
        >
          {explorer ? (
            <PanelLeftClose size={16} />
          ) : (
            <PanelLeftOpen size={16} />
          )}
        </button>
        <span className="neural-title">
          <Network size={15} /> Neural Map
        </span>
        <span className="neural-branch">
          <GitBranch size={13} />
          {name}
        </span>
        <div className="neural-filters">
          <label>
            <span className="sr-only">Node types</span>
            <select
              aria-label="Node types"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="all">All nodes</option>
              <option value="file">Files</option>
              <option value="directory">Folders</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Relationship types</span>
            <select
              aria-label="Relationship types"
              value={relationships}
              onChange={(e) => setRelationships(e.target.value)}
            >
              <option value="all">All connections</option>
              <option value="contains">Hierarchy</option>
              <option value="dependencies">Dependencies</option>
            </select>
          </label>
        </div>
      </div>
      <div className="neural-body">
        {explorer && (
          <aside
            className="neural-explorer"
            aria-label="Repository file explorer"
          >
            <div className="neural-explorer-heading">
              Files
              <button
                onClick={() => {
                  setCollapsed(
                    new Set(
                      graph.nodes
                        .filter((n) => n.type === "directory")
                        .map((n) => n.path),
                    ),
                  );
                  setLocalSelected(null);
                  onSelectFile?.(null);
                }}
              >
                Collapse all
              </button>
            </div>
            <label className="neural-search">
              <Search size={14} />
              <input
                aria-label="Search files and folders"
                placeholder="Find a file or folder…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <nav aria-label="Repository files">
              {query
                ? matches.map((n) => <div key={n.id}>{row(n, 0)}</div>)
                : tree("")}
              {query && matches.length === 0 && (
                <p className="neural-muted">No files match “{query}”.</p>
              )}
            </nav>
            <p className="neural-tree-note">
              {graph.nodes.filter((n) => n.type === "file").length} indexed
              files · Select to inspect
            </p>
          </aside>
        )}
        <div className="neural-stage">
          <Canvas
            nodes={view.nodes}
            links={view.links}
            selected={selected}
            focus={focus}
            onSelect={select}
            onToggle={toggle}
          />
          {!view.nodes.length && (
            <p className="neural-no-results">
              No nodes to display. Try another filter.
            </p>
          )}
          {selectedNode?.type === "directory" && (
            <div className="neural-folder-detail">
              <Folder size={16} />
              <strong>{selectedNode.path}</strong>
              <button onClick={() => toggle(selectedNode.path)}>
                {effectiveCollapsed.has(selectedNode.path)
                  ? "Expand folder"
                  : "Collapse folder"}
              </button>
            </div>
          )}
          <div className="neural-legend">
            <span>
              <i /> File
            </span>
            <span>
              <i className="directory-dot" /> Folder
            </span>
            <span className="neural-legend-line">
              Hierarchy & detected dependencies
            </span>
          </div>
        </div>
        {preview && (
          <aside className="neural-assistant">
            <div>
              <MessageSquareCode size={16} /> AI Assistant
            </div>
            <h3>Understand this repository</h3>
            <p>
              Ask about the codebase, explore relationships, and follow source
              references.
            </p>
            <span>Available in your workspace</span>
            <a href="#repository-url">
              Connect a repository <ChevronRight size={14} />
            </a>
          </aside>
        )}
      </div>
      <footer className="neural-footer" role="status">
        <span>
          {view.nodes.length} nodes · {view.links.length} connections
          {view.hidden > 0 && ` · ${view.hidden} more nodes — search to reveal`}
        </span>
        {repoId && (
          <Link href={`/workspace/${repoId}/chat`}>
            Ask RepoMind AI <MessageSquareCode size={12} />
          </Link>
        )}
        <span>
          Drag to orbit · Scroll to zoom · Right-click folders to collapse
        </span>
      </footer>
    </section>
  );
}
