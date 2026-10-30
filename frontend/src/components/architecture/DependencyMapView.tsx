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
  GitFork,
  Layers,
  Search,
  Filter,
  RotateCcw,
  Eye,
  EyeOff,
  Boxes,
  ArrowRight,
  ShieldCheck,
  Cpu
} from "lucide-react";
import { getDependencyMap, getEdgeDetails } from "@/lib/api";
import {
  DependencyMapResponse,
  EdgeDetails,
  CanonicalMetrics,
  ModuleNodeData,
  FileNodeData
} from "@/lib/types";
import { ModuleNode } from "./nodes/ModuleNode";
import { FileNode } from "./nodes/FileNode";
import { SemanticEdge } from "./nodes/SemanticEdge";
import { getLayoutedElements } from "@/lib/dagre-layout";
import { EdgeDetailsModal } from "./EdgeDetailsModal";

const nodeTypes: NodeTypes = {
  moduleNode: ModuleNode as any,
  fileDepNode: FileNode as any,
};

const edgeTypes: EdgeTypes = {
  semanticEdge: SemanticEdge as any,
};

const RELATIONSHIP_TYPES = [
  { id: "imports", label: "Imports", color: "#818cf8" },
  { id: "calls", label: "Function Calls", color: "#38bdf8" },
  { id: "inherits", label: "Inherits", color: "#c084fc" },
  { id: "api", label: "API Endpoints", color: "#fb923c" },
  { id: "data_access", label: "Data Access", color: "#34d399" },
];

interface DependencyMapViewProps {
  repoId: number;
  onSelectFile: (filePath: string) => void;
  selectedFilePath: string | null;
  onOpenFileViewer?: (filePath: string) => void;
}

export function DependencyMapView({
  repoId,
  onSelectFile,
  selectedFilePath,
  onOpenFileViewer,
}: DependencyMapViewProps) {
  const [level, setLevel] = useState<"modules" | "files">("modules");
  const [selectedModule, setSelectedModule] = useState<string | undefined>(undefined);
  const [data, setData] = useState<DependencyMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(
    new Set(["imports", "calls", "inherits", "api", "data_access"])
  );
  const [hideIsolated, setHideIsolated] = useState(true);

  // Focus & Edge inspection
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [selectedEdgeDetails, setSelectedEdgeDetails] = useState<EdgeDetails | null>(null);

  const fetchDependencyMap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDependencyMap(repoId, level, selectedModule);
      setData(res);

      const rawNodes: Node[] = res.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data,
        position: { x: 0, y: 0 },
      }));

      const rawEdges: Edge[] = res.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "semanticEdge",
        animated: e.animated,
        data: e.data,
      }));

      // Non-overlapping deterministic Dagre layout
      const layouted = getLayoutedElements(rawNodes, rawEdges, {
        direction: "LR",
        rankSep: level === "modules" ? 140 : 100,
        nodeSep: level === "modules" ? 60 : 45,
      });

      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading dependency map:", err);
      setError(err.message || "Failed to load dependency map");
      setLoading(false);
    }
  }, [repoId, level, selectedModule, setNodes, setEdges]);

  useEffect(() => {
    fetchDependencyMap();
  }, [fetchDependencyMap]);

  // Handle Level 1 module drilldown into Level 2
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "moduleNode") {
        const modData = node.data as unknown as ModuleNodeData;
        setSelectedModule(modData.name);
        setLevel("files");
      } else {
        // File node selected
        setFocusedNodeId(node.id);
        const filePath = (node.data as any)?.file_path || node.id.replace(/^file:/, "");
        onSelectFile(filePath);
      }
    },
    [onSelectFile]
  );

  // Handle Edge click for evidence inspection
  const handleEdgeClick = useCallback(
    async (_: React.MouseEvent, edge: Edge) => {
      try {
        const details = await getEdgeDetails(
          repoId,
          edge.source,
          edge.target,
          edge.data?.relationship_type as string
        );
        setSelectedEdgeDetails(details);
      } catch (err) {
        console.error("Failed to fetch edge details:", err);
      }
    },
    [repoId]
  );

  // Toggle relationship filter
  const toggleRelType = (relId: string) => {
    setActiveRelTypes((prev) => {
      const next = new Set(prev);
      if (next.has(relId)) {
        if (next.size > 1) next.delete(relId);
      } else {
        next.add(relId);
      }
      return next;
    });
  };

  // Connected nodes set for focus highlighting (Position preserved!)
  const connectedNodeIds = useMemo(() => {
    if (!focusedNodeId) return null;
    const connected = new Set<string>([focusedNodeId]);
    edges.forEach((edge) => {
      if (edge.source === focusedNodeId) connected.add(edge.target);
      if (edge.target === focusedNodeId) connected.add(edge.source);
    });
    return connected;
  }, [focusedNodeId, edges]);

  // Compute filtered & highlighted nodes
  const processedNodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return nodes
      .filter((n) => {
        if (hideIsolated && (n.data as any).is_isolated) return false;
        return true;
      })
      .map((node) => {
        const name = (node.data as any).name?.toLowerCase() || "";
        const matchesSearch = !q || name.includes(q);
        const isFocusedOrConnected = !connectedNodeIds || connectedNodeIds.has(node.id);
        const isTargetFocus = node.id === focusedNodeId;

        return {
          ...node,
          style: {
            ...node.style,
            opacity: matchesSearch && isFocusedOrConnected ? 1 : 0.18,
            transition: "opacity 0.2s ease, filter 0.2s ease",
            filter: matchesSearch && isFocusedOrConnected ? "none" : "grayscale(85%)",
          },
          selected: isTargetFocus,
        };
      });
  }, [nodes, hideIsolated, searchQuery, connectedNodeIds, focusedNodeId]);

  // Compute filtered edges
  const processedEdges = useMemo(() => {
    return edges
      .filter((e) => {
        const relType = (e.data?.relationship_type as string) || "imports";
        if (!activeRelTypes.has(relType)) return false;
        return true;
      })
      .map((edge) => {
        const isConnectedToFocus =
          !focusedNodeId ||
          edge.source === focusedNodeId ||
          edge.target === focusedNodeId;

        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isConnectedToFocus ? 0.9 : 0.1,
          },
        };
      });
  }, [edges, activeRelTypes, focusedNodeId]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#090d16] overflow-hidden select-none">
      {/* Top Controls Toolbar */}
      <div className="z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Level Switcher & Drilldown breadcrumb */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 font-mono text-xs">
            <button
              onClick={() => {
                setLevel("modules");
                setSelectedModule(undefined);
                setFocusedNodeId(null);
              }}
              className={`px-3 py-1 rounded-md transition-all ${
                level === "modules"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Level 1: Modules
            </button>
            <button
              onClick={() => {
                setLevel("files");
                setSelectedModule(undefined);
                setFocusedNodeId(null);
              }}
              className={`px-3 py-1 rounded-md transition-all ${
                level === "files"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Level 2: Files
            </button>
          </div>

          {selectedModule && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-300 bg-indigo-950/50 border border-indigo-800/60 px-2.5 py-1 rounded-lg">
              <span>Module: {selectedModule}</span>
              <button
                onClick={() => setSelectedModule(undefined)}
                className="text-slate-400 hover:text-white ml-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Center: Relationship Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {RELATIONSHIP_TYPES.map((rel) => {
            const active = activeRelTypes.has(rel.id);
            return (
              <button
                key={rel.id}
                onClick={() => toggleRelType(rel.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 border ${
                  active
                    ? "bg-slate-950 border-slate-700 text-slate-200 shadow-sm"
                    : "bg-slate-950/40 border-slate-800/40 text-slate-500 opacity-60"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: active ? rel.color : "#475569" }}
                />
                <span>{rel.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Isolated Toggle */}
        <div className="flex items-center gap-2">
          {/* Isolated file toggle */}
          {level === "files" && (
            <button
              onClick={() => setHideIsolated(!hideIsolated)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border flex items-center gap-1.5 transition-colors ${
                hideIsolated
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                  : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
              title="Hide or show files with 0 dependencies"
            >
              {hideIsolated ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{hideIsolated ? "Isolated Hidden" : "Show All"}</span>
            </button>
          )}

          {/* Search Box */}
          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search node..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800/80 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <button
            onClick={() => {
              setFocusedNodeId(null);
              setSearchQuery("");
              fetchDependencyMap();
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Reset Graph Layout"
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
              Computing deterministic multi-level dependency graph...
            </span>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <p className="text-sm text-rose-400 font-mono mb-2">{error}</p>
            <button
              onClick={fetchDependencyMap}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={processedNodes}
            edges={processedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
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

      {/* Canonical Metrics Floating HUD */}
      {data?.canonical_metrics && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 shadow-xl flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-200">
              <Boxes className="w-3.5 h-3.5 text-indigo-400" />
              <span>{data.canonical_metrics.indexed_files_count} Files</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-slate-200">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>{data.canonical_metrics.functions_count} Functions</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-indigo-300">
              <GitFork className="w-3.5 h-3.5" />
              <span>{data.canonical_metrics.total_relationships_count} Dependencies</span>
            </div>
            {focusedNodeId && (
              <button
                onClick={() => setFocusedNodeId(null)}
                className="text-[10px] text-amber-400 hover:underline ml-2"
              >
                Clear Focus
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edge Details Modal */}
      <EdgeDetailsModal
        details={selectedEdgeDetails}
        onClose={() => setSelectedEdgeDetails(null)}
        onOpenFile={onOpenFileViewer}
      />
    </div>
  );
}
