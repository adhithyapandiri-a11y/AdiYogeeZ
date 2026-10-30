"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Workflow,
  Search,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Code2,
  FileCode,
  CheckCircle2,
  ExternalLink,
  Info
} from "lucide-react";
import { getFeatureFlow } from "@/lib/api";
import { FeatureFlowResponse, FeatureStage } from "@/lib/types";
import { FeatureStageNode } from "./nodes/FeatureStageNode";

const nodeTypes: NodeTypes = {
  featureStageNode: FeatureStageNode as any,
};

interface FeatureFlowViewProps {
  repoId: number;
  onOpenFileViewer?: (filePath: string) => void;
}

export function FeatureFlowView({ repoId, onOpenFileViewer }: FeatureFlowViewProps) {
  const [data, setData] = useState<FeatureFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workflowQuery, setWorkflowQuery] = useState("Request Routing & Handling");
  const [activeStage, setActiveStage] = useState<FeatureStage | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const fetchFlow = useCallback(
    async (query?: string) => {
      try {
        setLoading(true);
        setError(null);
        const res = await getFeatureFlow(repoId, query || workflowQuery);
        setData(res);

        const flowNodes: Node[] = res.nodes.map((n) => ({
          id: n.id,
          type: "featureStageNode",
          position: n.position,
          data: n.data as any,
        }));

        const flowEdges: Edge[] = res.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type || "smoothstep",
          animated: e.animated,
          label: e.label,
          style: e.style,
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
        if (res.stages.length > 0) {
          setActiveStage(res.stages[0]);
        }
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading feature flow:", err);
        setError(err.message || "Failed to load feature flow");
        setLoading(false);
      }
    },
    [repoId, workflowQuery, setNodes, setEdges]
  );

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  const handleStageSelect = (preset: string) => {
    setWorkflowQuery(preset);
    fetchFlow(preset);
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.data) {
      setActiveStage(node.data as unknown as FeatureStage);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#090d16] overflow-hidden select-none">
      {/* Top Query & Preset Selector Bar */}
      <div className="z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Preset Workflow Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Workflow className="w-3.5 h-3.5 text-indigo-400" />
            Workflows:
          </span>
          {data?.preset_scenarios.map((preset) => {
            const isActive = workflowQuery === preset;
            return (
              <button
                key={preset}
                onClick={() => handleStageSelect(preset)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20"
                    : "bg-slate-950/70 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>

        {/* Custom Query Search */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Query workflow (e.g. cookie, error)..."
              value={workflowQuery}
              onChange={(e) => setWorkflowQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchFlow(workflowQuery);
              }}
              className="w-full bg-slate-950/70 border border-slate-800/80 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <button
            onClick={() => fetchFlow(workflowQuery)}
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors font-mono"
          >
            Trace
          </button>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/60 backdrop-blur-sm z-20">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <span className="text-xs font-mono text-slate-400">
              Inferring workflow execution pipeline from repository symbols...
            </span>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <p className="text-sm text-rose-400 font-mono mb-2">{error}</p>
            <button
              onClick={() => fetchFlow()}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.2}
            maxZoom={1.8}
            className="bg-[#090d16]"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" gap={24} size={1} />
            <Controls className="!bg-slate-900 !border-slate-800 !fill-slate-300 !rounded-xl !shadow-xl !overflow-hidden" />
          </ReactFlow>
        )}
      </div>

      {/* Static Analysis Notice Banner at Top-Left */}
      {data?.inference_meta && (
        <div className="absolute top-14 left-4 z-10 pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono shadow-xl flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-300 font-semibold">{data.inference_meta.method}</span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              {data.inference_meta.accuracy_notice}
            </span>
          </div>
        </div>
      )}

      {/* Active Stage Inspection Drawer (Bottom Sheet) */}
      {activeStage && (
        <div className="absolute bottom-4 right-4 max-w-lg w-full z-10 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-800 p-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[10px] font-mono font-bold">
                  {activeStage.stage_number}
                </span>
                <h4 className="text-xs font-bold text-slate-100 truncate">
                  {activeStage.title}
                </h4>
              </div>

              {onOpenFileViewer && (
                <button
                  onClick={() => onOpenFileViewer(activeStage.component)}
                  className="px-2.5 py-1 text-[11px] font-mono text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View File
                </button>
              )}
            </div>

            <p className="text-xs text-slate-300 mb-2 leading-relaxed">
              {activeStage.description}
            </p>

            {/* Code Reference Snippet */}
            {activeStage.code_reference && (
              <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto">
                <div className="text-[10px] text-slate-500 mb-1 flex items-center justify-between">
                  <span>{activeStage.code_reference.file_path}</span>
                  <span>Lines {activeStage.code_reference.start_line}-{activeStage.code_reference.end_line}</span>
                </div>
                <pre className="text-indigo-200">{activeStage.code_reference.snippet}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
