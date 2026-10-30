"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Search,
  FolderTree,
  RotateCcw,
  Maximize2,
  Folder,
  FileCode,
  Layers,
  ChevronRight,
  Filter
} from "lucide-react";
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

export function ProjectStructureView({
  repoId,
  onSelectFile,
  selectedFilePath
}: ProjectStructureViewProps) {
  const [data, setData] = useState<ProjectStructureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepth, setSelectedDepth] = useState<number | "all">("all");
  const [breadcrumb, setBreadcrumb] = useState<string[]>(["Root"]);

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

      // Apply deterministic non-overlapping Dagre layout
      const layouted = getLayoutedElements(rawNodes, rawEdges, {
        direction: "LR",
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
  }, [repoId, setNodes, setEdges]);

  useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

  // Handle node selection
  const handleNodeClick = useCallback(
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

  // Search filtering
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.map((node) => {
      const name = (node.data as any).name?.toLowerCase() || "";
      const path = (node.data as any).file_path?.toLowerCase() || (node.data as any).path?.toLowerCase() || "";
      const matches = name.includes(q) || path.includes(q);
      return {
        ...node,
        style: {
          ...node.style,
          opacity: matches ? 1 : 0.2,
          filter: matches ? "none" : "grayscale(80%)",
        },
      };
    });
  }, [nodes, searchQuery]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#090d16] overflow-hidden select-none">
      {/* Top Controls Toolbar */}
      <div className="z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Breadcrumbs & Search */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800/80 max-w-md overflow-x-auto">
            <FolderTree className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                <span
                  className={
                    idx === breadcrumb.length - 1
                      ? "text-indigo-300 font-semibold truncate"
                      : "text-slate-400 truncate hover:text-slate-200 cursor-pointer"
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search file or folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 font-mono transition-all"
            />
          </div>
        </div>

        {/* Right: Summary Metrics & Controls */}
        <div className="flex items-center gap-2 text-xs">
          {data && (
            <div className="hidden lg:flex items-center gap-3 text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80 font-mono">
              <span>
                <strong className="text-slate-200">{data.stats.total_files}</strong> files
              </span>
              <span>•</span>
              <span>
                <strong className="text-slate-200">{data.stats.total_directories}</strong> dirs
              </span>
              <span>•</span>
              <span>
                max depth <strong className="text-slate-200">{data.stats.max_depth}</strong>
              </span>
            </div>
          )}

          <button
            onClick={() => {
              setSearchQuery("");
              setBreadcrumb(["Root"]);
              fetchStructure();
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Graph Canvas */}
      <div className="flex-1 w-full h-full relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/60 backdrop-blur-sm z-20">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <span className="text-xs font-mono text-slate-400">
              Generating physical containment hierarchy...
            </span>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <p className="text-sm text-rose-400 font-mono mb-2">{error}</p>
            <button
              onClick={fetchStructure}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={filteredNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
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
      </div>

      {/* Help Banner at Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 font-mono shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>Containment Hierarchy Only — No cross-file import edges</span>
        </div>
      </div>
    </div>
  );
}
