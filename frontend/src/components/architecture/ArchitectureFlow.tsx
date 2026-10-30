"use client";

import React, { useMemo } from "react";
import { 
  ReactFlow, 
  Controls, 
  Background, 
  MiniMap, 
  Handle, 
  Position, 
  NodeProps, 
  BackgroundVariant 
} from "@xyflow/react";
import { FileCode, Layers, ArrowRight, Code } from "lucide-react";

// Custom Node for React Flow
function CustomCodeNode({ data }: any) {
  return (
    <div className="w-56 rounded-xl bg-[#0f172a] border border-white/10 shadow-xl p-3 text-xs text-slate-200 hover:border-indigo-500/50 transition-all group">
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-indigo-400" />
      
      {/* Node Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
        <span className="font-semibold text-slate-100 truncate flex items-center space-x-1.5">
          <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">{data.label}</span>
        </span>
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {data.layer}
        </span>
      </div>

      <div className="pt-1.5 space-y-1 text-[11px] text-slate-400">
        <div className="truncate">{data.file_path}</div>
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{data.language}</span>
          <span>{data.line_count} lines</span>
        </div>

        {data.functions && data.functions.length > 0 && (
          <div className="pt-1 flex flex-wrap gap-1">
            {data.functions.map((fn: string, i: number) => (
              <span key={i} className="px-1 py-0.2 rounded bg-slate-800 text-[10px] text-indigo-300 font-mono">
                {fn}()
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-violet-400" />
    </div>
  );
}

interface ArchitectureFlowProps {
  nodes: any[];
  edges: any[];
  onSelectNode: (filePath: string) => void;
}

export default function ArchitectureFlow({ nodes, edges, onSelectNode }: ArchitectureFlowProps) {
  const nodeTypes = useMemo(() => ({ customCodeNode: CustomCodeNode }), []);

  return (
    <div className="w-full h-full bg-[#090d16]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={(_, node) => onSelectNode(node.id)}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255, 255, 255, 0.05)" />
        <Controls className="!bg-slate-900 !border-white/10" />
        <MiniMap 
          nodeColor="#6366f1"
          maskColor="rgba(9, 13, 22, 0.8)"
          className="!bg-slate-950 !border-white/10"
        />
      </ReactFlow>
    </div>
  );
}
