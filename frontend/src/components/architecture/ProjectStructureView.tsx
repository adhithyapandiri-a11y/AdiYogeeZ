"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Search,
  FolderTree,
  RotateCcw,
  Code2,
  LayoutGrid,
  Copy,
  Check,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
  Filter,
  Sparkles,
  GitFork,
  FileCode,
  Folder,
} from "lucide-react";
import mermaid from "mermaid";
import { getProjectStructure } from "@/lib/api";
import { ProjectStructureResponse, DirectoryNodeData, FileNodeData } from "@/lib/types";
import { DirectoryNode } from "./nodes/DirectoryNode";
import { FileNode } from "./nodes/FileNode";
import { getLayoutedElements } from "@/lib/dagre-layout";

const nodeTypes: NodeTypes = {
  directoryNode: DirectoryNode as any,
  fileNode: FileNode as any,
};

interface ProjectStructureViewProps {
  repoId: number;
  onSelectFile: (filePath: string) => void;
  selectedFilePath: string | null;
}

// Map architectural roles to GitDiagram class names and color styling
const ROLE_TO_CLASS: Record<string, string> = {
  "Entry Point": "entryPoint",
  "Route / Controller": "route",
  "Service": "service",
  "Test Suite": "test",
  "Test": "test",
  "Configuration": "config",
  "Utility / Helper": "util",
  "Utility": "util",
  "Data Access / Database": "dataModel",
  "Model": "dataModel",
  "Error Boundary": "errorBoundary",
};

export function ProjectStructureView({
  repoId,
  onSelectFile,
  selectedFilePath,
}: ProjectStructureViewProps) {
  const [data, setData] = useState<ProjectStructureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GitDiagram Presentation Modes: "diagram" (Mermaid visual), "canvas" (ReactFlow), "code" (Mermaid syntax)
  const [presentationMode, setPresentationMode] = useState<"diagram" | "canvas" | "code">("diagram");
  const [orientation, setOrientation] = useState<"TD" | "LR">("TD");
  const [folderScope, setFolderScope] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // SVG Pan/Zoom state for GitDiagram Diagram mode
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Mermaid SVG rendering states
  const [renderedSvg, setRenderedSvg] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);

  // ReactFlow elements for Canvas mode
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(["Root"]);

  // Lookup map: sanitized Mermaid ID -> raw file path
  const nodeIdToPathMap = useRef<Map<string, string>>(new Map());

  // Initialize Mermaid once client-side
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        darkMode: true,
        background: "#090d16",
        primaryColor: "#4f46e5",
        primaryBorderColor: "#6366f1",
        primaryTextColor: "#f8fafc",
        lineColor: "#475569",
        secondaryColor: "#0f172a",
        tertiaryColor: "#1e293b",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "12px",
      },
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        padding: 16,
        nodeSpacing: 40,
        rankSpacing: 50,
      },
      securityLevel: "loose",
    });
  }, []);

  // Fetch containment hierarchy from backend
  const fetchStructure = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProjectStructure(repoId);
      setData(res);

      const rawNodes: Node[] = res.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data as any,
        position: { x: 0, y: 0 },
      }));

      const rawEdges: Edge[] = res.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        style: { stroke: "#475569", strokeWidth: 1.5, opacity: 0.6 },
      }));

      // Non-overlapping deterministic Dagre layout for ReactFlow Canvas
      const layouted = getLayoutedElements(rawNodes, rawEdges, {
        direction: orientation === "TD" ? "TB" : "LR",
        rankSep: 85,
        nodeSep: 35,
      });

      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading project structure:", err);
      setError(err.message || "Failed to load project structure");
      setLoading(false);
    }
  }, [repoId, orientation, setNodes, setEdges]);

  useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

  // Extract top-level folders for scope dropdown
  const topLevelFolders = useMemo(() => {
    if (!data) return [];
    return data.nodes
      .filter((n) => n.type === "directoryNode" && (n.data as DirectoryNodeData).depth === 1)
      .map((n) => (n.data as DirectoryNodeData).name)
      .sort();
  }, [data]);

  // Generate valid GitDiagram-formatted Mermaid syntax
  const mermaidCode = useMemo(() => {
    if (!data) return "";

    const idMap = new Map<string, string>();
    nodeIdToPathMap.current.clear();

    const sanitize = (id: string) => {
      const clean = "n_" + id.replace(/[^a-zA-Z0-9_]/g, "_");
      return clean;
    };

    const dirNodes = data.nodes.filter((n) => n.type === "directoryNode") as Array<{
      id: string;
      data: DirectoryNodeData;
    }>;
    const fileNodes = data.nodes.filter((n) => n.type === "fileNode") as Array<{
      id: string;
      data: FileNodeData;
    }>;

    // Deduplicate by file_path
    const seenFiles = new Set<string>();
    const uniqueFileNodes = fileNodes.filter((f) => {
      if (seenFiles.has(f.data.file_path)) return false;
      seenFiles.add(f.data.file_path);
      return true;
    });

    // Filter by folder scope and search query
    const q = searchQuery.toLowerCase().trim();
    const activeFiles = uniqueFileNodes.filter((f) => {
      const p = f.data.file_path;
      if (folderScope !== "all" && !p.startsWith(folderScope + "/") && p !== folderScope) {
        return false;
      }
      if (q && !p.toLowerCase().includes(q) && !f.data.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    // Collect directories that contain matching files
    const relevantDirPaths = new Set<string>([""]);
    activeFiles.forEach((f) => {
      const parts = f.data.file_path.split("/");
      parts.pop();
      let acc = "";
      parts.forEach((p) => {
        acc = acc ? `${acc}/${p}` : p;
        relevantDirPaths.add(acc);
      });
    });

    const activeDirs = dirNodes.filter((d) => relevantDirPaths.has(d.data.path));

    // Build hierarchy tree
    const lines: string[] = [`flowchart ${orientation}`];

    // Track classes for styling
    const classAssignments: Record<string, string[]> = {
      entryPoint: [],
      route: [],
      service: [],
      test: [],
      config: [],
      util: [],
      dataModel: [],
      errorBoundary: [],
    };

    // Recursive directory rendering
    const renderDirectory = (dirPath: string, indent: string) => {
      const dirInfo = activeDirs.find((d) => d.data.path === dirPath);
      const isRoot = !dirPath;
      const title = isRoot ? "Repository Root" : dirInfo?.data.name || dirPath;
      const cleanDirId = sanitize(isRoot ? "root" : `dir_${dirPath}`);

      lines.push(`${indent}subgraph ${cleanDirId}["📁 ${title}"]`);

      // Files directly in this directory
      const childFiles = activeFiles.filter((f) => {
        const parts = f.data.file_path.split("/");
        parts.pop();
        const fDir = parts.join("/");
        return fDir === dirPath;
      });

      // Render file nodes
      childFiles.forEach((f) => {
        const cleanFileId = sanitize(`file_${f.data.file_path}`);
        idMap.set(cleanFileId, f.data.file_path);
        nodeIdToPathMap.current.set(cleanFileId, f.data.file_path);

        const role = f.data.architectural_role || "Component";
        const linesCount = f.data.line_count ? `${f.data.line_count}L` : "";
        const roleAndLines = linesCount ? `${role} • ${linesCount}` : role;
        const rawName = f.data.raw_name || f.data.name;

        // Escape double quotes and characters for Mermaid label
        const safeName = rawName.replace(/"/g, "'");
        const safeSub = roleAndLines.replace(/"/g, "'");

        lines.push(`${indent}  ${cleanFileId}["📄 ${safeName}<br/><small>${safeSub}</small>"]`);

        // Classify node
        const cls = ROLE_TO_CLASS[role] || "default";
        if (cls !== "default" && classAssignments[cls]) {
          classAssignments[cls].push(cleanFileId);
        }
      });

      // Child subdirectories
      const childDirs = activeDirs.filter((d) => {
        if (d.data.path === dirPath) return false;
        const parts = d.data.path.split("/");
        parts.pop();
        const parentPath = parts.join("/");
        return parentPath === dirPath;
      });

      childDirs.forEach((cd) => {
        renderDirectory(cd.data.path, indent + "  ");
      });

      lines.push(`${indent}end`);
    };

    renderDirectory("", "  ");

    // Add inter-module connections or containment edges
    data.edges.forEach((e) => {
      const sourceFile = fileNodes.find((f) => f.id === e.source);
      const targetFile = fileNodes.find((f) => f.id === e.target);
      if (sourceFile && targetFile) {
        const sClean = sanitize(`file_${sourceFile.data.file_path}`);
        const tClean = sanitize(`file_${targetFile.data.file_path}`);
        if (idMap.has(sClean) && idMap.has(tClean)) {
          lines.push(`  ${sClean} --> ${tClean}`);
        }
      }
    });

    // GitDiagram Dark Architectural Theme Styles
    lines.push("");
    lines.push("  %% GitDiagram Dark Architecture Theme");
    lines.push("  classDef default fill:#0b1120,stroke:#334155,stroke-width:1px,color:#f8fafc;");
    lines.push("  classDef entryPoint fill:#312e81,stroke:#6366f1,stroke-width:1.5px,color:#e0e7ff;");
    lines.push("  classDef route fill:#082f49,stroke:#0ea5e9,stroke-width:1.5px,color:#e0f2fe;");
    lines.push("  classDef service fill:#1e1b4b,stroke:#818cf8,stroke-width:1.5px,color:#e0e7ff;");
    lines.push("  classDef test fill:#064e3b,stroke:#10b981,stroke-width:1.5px,color:#ecfdf5;");
    lines.push("  classDef config fill:#365314,stroke:#84cc16,stroke-width:1.5px,color:#f7fee7;");
    lines.push("  classDef util fill:#374151,stroke:#9ca3af,stroke-width:1px,color:#f3f4f6;");
    lines.push("  classDef dataModel fill:#3b0764,stroke:#c084fc,stroke-width:1.5px,color:#fae8ff;");
    lines.push("  classDef errorBoundary fill:#4c0519,stroke:#f43f5e,stroke-width:1.5px,color:#ffe4e6;");

    // Apply classes
    Object.entries(classAssignments).forEach(([cls, nodeIds]) => {
      if (nodeIds.length > 0) {
        lines.push(`  class ${nodeIds.join(",")} ${cls};`);
      }
    });

    return lines.join("\n");
  }, [data, folderScope, searchQuery, orientation]);

  // Render Mermaid SVG when in "diagram" mode
  useEffect(() => {
    if (presentationMode !== "diagram" || !mermaidCode) return;

    let isMounted = true;
    const renderDiagram = async () => {
      try {
        setRenderError(null);
        const uniqueId = `gitdiagram-svg-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, mermaidCode);
        if (isMounted) {
          setRenderedSvg(svg);
        }
      } catch (err: any) {
        console.error("Failed to render Mermaid diagram:", err);
        if (isMounted) {
          setRenderError(err.message || "Failed to render Mermaid diagram");
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [presentationMode, mermaidCode]);

  // Attach interactive click handlers to rendered Mermaid SVG nodes
  useEffect(() => {
    if (presentationMode !== "diagram" || !renderedSvg || !svgContainerRef.current) return;

    const container = svgContainerRef.current;
    const nodes = container.querySelectorAll(".node");

    const handleNodeClick = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      const elementId = target.id || "";
      // Mermaid node ID format: flowchart-<cleanId>-<number>
      for (const [cleanId, filePath] of nodeIdToPathMap.current.entries()) {
        if (elementId.includes(cleanId)) {
          onSelectFile(filePath);
          return;
        }
      }
    };

    nodes.forEach((n) => {
      (n as HTMLElement).style.cursor = "pointer";
      n.addEventListener("click", handleNodeClick);
    });

    return () => {
      nodes.forEach((n) => {
        n.removeEventListener("click", handleNodeClick);
      });
    };
  }, [presentationMode, renderedSvg, onSelectFile]);

  // Copy Mermaid code to clipboard
  const handleCopyMermaid = async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy Mermaid code:", err);
    }
  };

  // Download Mermaid file (.mmd)
  const handleDownloadMmd = () => {
    const blob = new Blob([mermaidCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gitdiagram-architecture-${repoId}.mmd`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download SVG
  const handleDownloadSvg = () => {
    if (!renderedSvg) return;
    const blob = new Blob([renderedSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gitdiagram-architecture-${repoId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Open in Mermaid Live Editor
  const handleOpenLiveEditor = () => {
    const state = {
      code: mermaidCode,
      mermaid: { theme: "dark" },
      autoSync: true,
      updateDiagram: true,
    };
    const json = JSON.stringify(state);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    window.open(`https://mermaid.live/edit#base64:${base64}`, "_blank");
  };

  // Zoom handlers for GitDiagram Diagram mode
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, z + 0.2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.3, z - 0.2));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (presentationMode !== "diagram") return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || presentationMode !== "diagram") return;
    setPanOffset({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  // ReactFlow canvas node selection
  const handleCanvasNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "fileNode") {
        const fileData = node.data as unknown as FileNodeData;
        onSelectFile(fileData.file_path);
        const parts = fileData.file_path.split("/");
        setBreadcrumb(["Root", ...parts]);
      } else if (node.type === "directoryNode") {
        const dirData = node.data as unknown as DirectoryNodeData;
        if (dirData.is_root) {
          setBreadcrumb(["Root"]);
        } else {
          setBreadcrumb(["Root", ...dirData.path.split("/")]);
        }
      }
    },
    [onSelectFile]
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-[#090d16] overflow-hidden select-none">
      {/* Top GitDiagram Action Bar */}
      <div className="z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mode Switcher & Scope Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* GitDiagram Mode Tabs */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setPresentationMode("diagram")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                presentationMode === "diagram"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Diagram</span>
            </button>

            <button
              onClick={() => setPresentationMode("canvas")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                presentationMode === "canvas"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </button>

            <button
              onClick={() => setPresentationMode("code")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                presentationMode === "code"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Mermaid Code</span>
            </button>
          </div>

          {/* Directory Scope Filter */}
          {topLevelFolders.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={folderScope}
                onChange={(e) => setFolderScope(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  All Folders
                </option>
                {topLevelFolders.map((f) => (
                  <option key={f} value={f} className="bg-slate-900 text-slate-200">
                    📁 {f}/
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Orientation Toggle */}
          <button
            onClick={() => setOrientation((o) => (o === "TD" ? "LR" : "TD"))}
            className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
            title="Toggle Top-to-Bottom / Left-to-Right orientation"
          >
            {orientation === "TD" ? "Orientation: TD ↓" : "Orientation: LR →"}
          </button>
        </div>

        {/* Right: Search, Copy Mermaid, Export & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative w-40 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search file/dir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800/80 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Copy Mermaid Code Button */}
          <button
            onClick={handleCopyMermaid}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              copied
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
            }`}
            title="Copy Mermaid.js architecture code to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Mermaid"}</span>
          </button>

          {/* Export Actions */}
          <div className="relative group">
            <button
              className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Export diagram"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-30 min-w-[150px] font-mono text-xs">
              <button
                onClick={handleDownloadMmd}
                className="px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
              >
                Download .mmd
              </button>
              <button
                onClick={handleDownloadSvg}
                className="px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
              >
                Download .svg
              </button>
              <button
                onClick={handleOpenLiveEditor}
                className="px-3 py-1.5 text-left text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-between"
              >
                <span>Live Editor</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Zoom controls (for Diagram mode) */}
          {presentationMode === "diagram" && (
            <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={handleZoomIn}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                title="Fit View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Presentation View Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/60 backdrop-blur-sm z-20">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <span className="text-xs font-mono text-slate-400">
              Parsing repository containment hierarchy into GitDiagram format...
            </span>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <p className="text-sm text-rose-400 font-mono mb-2">{error}</p>
            <button
              onClick={fetchStructure}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 font-mono"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* MODE 1: GitDiagram Visual Diagram (Interactive Mermaid SVG with Pan & Zoom) */}
            {presentationMode === "diagram" && (
              <div
                className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-[#090d16]"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {renderError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs text-amber-400 font-mono mb-2">
                      Complex diagram rendered in Code and Canvas views.
                    </p>
                    <button
                      onClick={() => setPresentationMode("canvas")}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-mono"
                    >
                      Switch to Canvas View
                    </button>
                  </div>
                ) : (
                  <div
                    ref={svgContainerRef}
                    className="gitdiagram-svg-container w-full h-full flex items-center justify-center transition-transform duration-75 select-none"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                      transformOrigin: "center center",
                    }}
                    dangerouslySetInnerHTML={{ __html: renderedSvg }}
                  />
                )}

                {/* GitDiagram Click Notice */}
                <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                  <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono shadow-xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span>Click any file node to inspect details • Drag canvas to pan</span>
                  </div>
                </div>

                <style jsx global>{`
                  .gitdiagram-svg-container svg {
                    max-width: none !important;
                    height: auto !important;
                  }
                  .gitdiagram-svg-container .node {
                    transition: filter 0.15s ease, stroke-width 0.15s ease;
                  }
                  .gitdiagram-svg-container .node:hover {
                    filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6)) brightness(1.15);
                  }
                `}</style>
              </div>
            )}

            {/* MODE 2: Interactive ReactFlow Canvas */}
            {presentationMode === "canvas" && (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleCanvasNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.1}
                maxZoom={2.0}
                className="bg-[#090d16]"
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#1e293b" gap={24} size={1} />
                <Controls className="!bg-slate-900 !border-slate-800 !fill-slate-300 !rounded-xl !shadow-xl !overflow-hidden" />
              </ReactFlow>
            )}

            {/* MODE 3: Raw Mermaid Code (GitDiagram Format with Line Numbers & One-Click Copy) */}
            {presentationMode === "code" && (
              <div className="w-full h-full flex flex-col bg-[#070b12] text-slate-200 font-mono text-xs overflow-hidden">
                {/* Code View Top Bar */}
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-indigo-300">
                      architecture.mmd
                    </span>
                    <span>{mermaidCode.split("\n").length} lines</span>
                    <span>•</span>
                    <span>{mermaidCode.length} characters</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyMermaid}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Copied" : "Copy Code"}</span>
                    </button>
                    <button
                      onClick={handleOpenLiveEditor}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] transition-colors"
                    >
                      <span>Open in Mermaid Live</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Code Panel with Line Numbers */}
                <div className="flex-1 overflow-auto p-4 flex">
                  {/* Line Numbers Column */}
                  <div className="select-none pr-4 text-right text-slate-600 border-r border-slate-800/80 mr-4 font-mono text-[11px] leading-5">
                    {mermaidCode.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>

                  {/* Code Body */}
                  <pre className="flex-1 text-slate-300 font-mono text-[11px] leading-5 whitespace-pre overflow-x-auto selection:bg-indigo-500/30">
                    {mermaidCode}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* GitDiagram Summary Footer HUD */}
      {data?.stats && (
        <div className="h-9 border-t border-slate-800/80 bg-slate-950/90 px-4 flex items-center justify-between text-xs text-slate-400 font-mono z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
              <strong className="text-slate-200">{data.stats.total_files}</strong> files
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-200">{data.stats.total_directories}</strong> directories
            </span>
            <span>•</span>
            <span>
              max depth <strong className="text-slate-200">{data.stats.max_depth}</strong>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
            <span>Compatible with GitHub README, Notion, Obsidian & Mermaid.js</span>
          </div>
        </div>
      )}
    </div>
  );
}
