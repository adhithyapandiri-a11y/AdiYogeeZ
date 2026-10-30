"use client";

import React from "react";
import { X, ExternalLink, GitCommit, FileCode, CheckCircle2 } from "lucide-react";
import { EdgeDetails } from "@/lib/types";

interface EdgeDetailsModalProps {
  details: EdgeDetails | null;
  onClose: () => void;
  onOpenFile?: (path: string) => void;
}

export function EdgeDetailsModal({ details, onClose, onOpenFile }: EdgeDetailsModalProps) {
  if (!details) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <FileCode className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Relationship Code Evidence
              </h3>
              <p className="text-xs text-slate-400">
                Static analysis evidence connecting source to target
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-semibold block mb-1">
              Source File
            </span>
            <p className="text-xs font-mono font-medium text-slate-200 truncate" title={details.source}>
              {details.source}
            </p>
            <span className="text-[10px] text-indigo-400 font-mono mt-1 inline-block">
              Line {details.evidence_line}
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-semibold block mb-1">
              Target File
            </span>
            <p className="text-xs font-mono font-medium text-slate-200 truncate" title={details.target}>
              {details.target}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 font-mono border border-indigo-800/50 mt-1 inline-block">
              {details.relationship_type}
            </span>
          </div>
        </div>

        {/* Evidence Code Snippet */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
            <span>Code Snippet (at line {details.evidence_line}):</span>
            <span className="text-[10px] text-slate-500">Exact match</span>
          </div>
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
            <pre>{details.evidence_snippet}</pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          {onOpenFile && (
            <button
              onClick={() => {
                onOpenFile(details.source);
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Source in Viewer
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
