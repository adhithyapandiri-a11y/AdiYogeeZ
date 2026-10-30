"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Workflow, Code2, AlertTriangle, ArrowRight, CornerDownRight } from "lucide-react";
import { FeatureStage } from "@/lib/types";

export const FeatureStageNode = memo(({ data, selected }: { data: FeatureStage; selected?: boolean }) => {
  const isError = data.is_error_stage;

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 select-none ${
        isError
          ? "border-rose-500/40 bg-rose-950/20 hover:border-rose-500/80 shadow-lg shadow-rose-950/30"
          : selected
          ? "border-indigo-400 bg-slate-900/95 shadow-xl shadow-indigo-500/25 ring-2 ring-indigo-500/60"
          : "border-slate-800/90 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900/95"
      } backdrop-blur-md p-4 w-[310px] text-left cursor-pointer`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-2.5 !h-2.5 !border-slate-900 ${isError ? "!bg-rose-500" : "!bg-indigo-500"}`}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
              isError ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
            }`}
          >
            {data.stage_number}
          </span>
          <span className="text-xs font-bold text-slate-100 tracking-tight">
            {data.title}
          </span>
        </div>

        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${
            isError ? "bg-rose-950/60 text-rose-300 border-rose-800/50" : "bg-slate-800 text-slate-400 border-slate-700/60"
          }`}
        >
          {data.role}
        </span>
      </div>

      {/* Component & Function */}
      <div className="mb-2.5 bg-slate-950/60 rounded-lg p-2 border border-slate-800/60 font-mono">
        <div className="text-[11px] text-indigo-300 truncate font-semibold">
          {data.component}
        </div>
        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
          <Code2 className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="truncate">{data.function_or_symbol}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-slate-300 line-clamp-2 mb-2.5 leading-relaxed">
        {data.description}
      </p>

      {/* Input / Output Spec */}
      <div className="space-y-1 text-[10px] pt-2 border-t border-slate-800/60 font-mono">
        <div className="flex items-start gap-1 text-slate-400">
          <span className="text-slate-500 shrink-0 font-semibold">IN:</span>
          <span className="truncate text-slate-300">{data.input_spec}</span>
        </div>
        <div className="flex items-start gap-1 text-slate-400">
          <span className="text-slate-500 shrink-0 font-semibold">OUT:</span>
          <span className="truncate text-slate-300">{data.output_spec}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={`!w-2.5 !h-2.5 !border-slate-900 ${isError ? "!bg-rose-500" : "!bg-indigo-500"}`}
      />
    </div>
  );
});

FeatureStageNode.displayName = "FeatureStageNode";
