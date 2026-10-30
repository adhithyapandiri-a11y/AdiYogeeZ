"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { FileCode, ArrowDownRight, ArrowUpRight, Cpu } from "lucide-react";
import { FileNodeData } from "@/lib/types";

export const FileNode = memo(({ data, selected }: { data: FileNodeData; selected?: boolean }) => {
  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 select-none ${
        selected
          ? "border-indigo-400 bg-slate-900/95 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500"
          : data.is_isolated
          ? "border-slate-800/50 bg-slate-950/60 opacity-75 hover:opacity-100 hover:border-slate-700"
          : "border-slate-800/90 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900/95"
      } backdrop-blur-md px-3.5 py-2.5 w-[270px] text-left cursor-pointer`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-indigo-500/80 !border-slate-900"
      />

      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="p-1 rounded-md shrink-0 flex items-center justify-center text-xs"
            style={{ backgroundColor: `${data.color}20`, color: data.color }}
          >
            <FileCode className="w-3.5 h-3.5" />
          </div>
          <div className="truncate min-w-0">
            <p className="font-semibold text-xs text-slate-100 truncate tracking-tight font-mono">
              {data.name}
            </p>
          </div>
        </div>

        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 border"
          style={{
            backgroundColor: `${data.role_color || "#6b7280"}15`,
            color: data.role_color || "#94a3b8",
            borderColor: `${data.role_color || "#6b7280"}30`
          }}
        >
          {data.architectural_role}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/60 font-mono">
        <div className="flex items-center gap-2">
          <span>{data.line_count}L</span>
          {data.function_count > 0 && (
            <span className="flex items-center gap-0.5 text-sky-400">
              <Cpu className="w-3 h-3" />
              {data.function_count}f
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-0.5 text-slate-400" title="Incoming dependencies">
            <ArrowDownRight className="w-3 h-3 text-emerald-400" />
            {data.incoming_count}
          </span>
          <span className="flex items-center gap-0.5 text-slate-400" title="Outgoing dependencies">
            <ArrowUpRight className="w-3 h-3 text-indigo-400" />
            {data.outgoing_count}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-indigo-500/80 !border-slate-900"
      />
    </div>
  );
});

FileNode.displayName = "FileNode";
