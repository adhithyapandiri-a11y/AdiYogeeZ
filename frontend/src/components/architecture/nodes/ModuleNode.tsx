"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Box, ArrowDownRight, ArrowUpRight, ChevronRight, FileText } from "lucide-react";
import { ModuleNodeData } from "@/lib/types";

export const ModuleNode = memo(({ data, selected }: { data: ModuleNodeData; selected?: boolean }) => {
  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 select-none ${
        selected
          ? "border-indigo-400 bg-slate-900/95 shadow-xl shadow-indigo-500/25 ring-2 ring-indigo-500/60"
          : "border-slate-800/90 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900/95"
      } backdrop-blur-md p-4 w-[290px] text-left cursor-pointer`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-indigo-500 !border-slate-900"
      />

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
            <Box className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-slate-100 truncate tracking-tight">
              {data.name}
            </h4>
            <span
              className="text-[10px] px-1.5 py-0.2 rounded font-mono inline-block border mt-0.5"
              style={{
                backgroundColor: `${data.role_color || "#8b5cf6"}15`,
                color: data.role_color || "#a78bfa",
                borderColor: `${data.role_color || "#8b5cf6"}30`
              }}
            >
              {data.architectural_role}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono font-bold text-slate-200">{data.file_count}</span>
          <span className="text-[10px] text-slate-400 block font-mono">files</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 py-2 border-t border-b border-slate-800/60 my-2 font-mono">
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          {data.total_lines.toLocaleString()} lines
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-0.5 text-emerald-400" title="Incoming module connections">
            <ArrowDownRight className="w-3.5 h-3.5" />
            {data.incoming_count}
          </span>
          <span className="flex items-center gap-0.5 text-indigo-400" title="Outgoing module connections">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {data.outgoing_count}
          </span>
        </div>
      </div>

      {data.languages && data.languages.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1">
          {data.languages.map((l) => (
            <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {l}
            </span>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-indigo-500 !border-slate-900"
      />
    </div>
  );
});

ModuleNode.displayName = "ModuleNode";
