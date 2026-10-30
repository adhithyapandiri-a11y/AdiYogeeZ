"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Folder, FolderOpen, Database, ChevronRight, Layers } from "lucide-react";
import { DirectoryNodeData } from "@/lib/types";

export const DirectoryNode = memo(({ data, selected }: { data: DirectoryNodeData; selected?: boolean }) => {
  const isRoot = data.is_root;

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 select-none ${
        selected
          ? "border-indigo-400 bg-slate-900/95 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500"
          : "border-slate-800/90 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900/95"
      } backdrop-blur-md px-3.5 py-3 w-[260px] text-left cursor-pointer`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-indigo-500/80 !border-slate-900"
      />

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${isRoot ? "bg-indigo-500/15 text-indigo-400" : "bg-slate-800/80 text-amber-400"}`}>
            {isRoot ? <Database className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
          </div>
          <span className="font-semibold text-xs text-slate-100 truncate tracking-tight font-mono">
            {data.name}
          </span>
        </div>

        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-mono shrink-0">
          {data.architectural_role}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/60">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-slate-200 font-mono">{data.file_count}</strong> files
          </span>
          {data.folder_count > 0 && (
            <span>
              <strong className="text-slate-200 font-mono">{data.folder_count}</strong> dirs
            </span>
          )}
        </div>

        {data.languages && data.languages.length > 0 && (
          <div className="flex items-center gap-1">
            {data.languages.slice(0, 2).map((lang) => (
              <span key={lang} className="text-[9px] px-1 py-0.2 rounded bg-indigo-950/60 text-indigo-300 font-mono">
                {lang}
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-indigo-500/80 !border-slate-900"
      />
    </div>
  );
});

DirectoryNode.displayName = "DirectoryNode";
