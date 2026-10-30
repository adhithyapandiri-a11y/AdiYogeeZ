"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  FileCode, 
  Code, 
  Box, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ExternalLink,
  Copy,
  Check,
  Tag
} from "lucide-react";
import { getNodeDetails } from "@/lib/api";
import { NodeDetails } from "@/lib/types";

interface NodeDetailsDrawerProps {
  repoId: number;
  filePath: string | null;
  onClose: () => void;
  onOpenFullCode: (path: string) => void;
  onSelectRelatedFile?: (path: string) => void;
}

export default function NodeDetailsDrawer({
  repoId,
  filePath,
  onClose,
  onOpenFullCode,
  onSelectRelatedFile
}: NodeDetailsDrawerProps) {
  const [details, setDetails] = useState<NodeDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    getNodeDetails(repoId, filePath)
      .then((data) => {
        setDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load node details:", err);
        setLoading(false);
      });
  }, [repoId, filePath]);

  if (!filePath) return null;

  const copyPath = () => {
    navigator.clipboard.writeText(filePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-0 right-0 h-full w-[400px] z-30 bg-slate-950/95 border-l border-slate-800/90 backdrop-blur-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/60">
        <div className="flex items-center space-x-2.5 truncate">
          <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
            <FileCode className="w-4 h-4 shrink-0" />
          </div>
          <div className="truncate">
            <span className="font-semibold text-sm text-slate-100 truncate block font-mono">
              {filePath.split("/").pop()}
            </span>
            <span className="text-[10px] text-slate-400 truncate block font-mono">
              {filePath}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {loading || !details ? (
          <div className="h-40 flex items-center justify-center text-slate-400">
            <span className="font-mono text-xs">Loading node architecture details...</span>
          </div>
        ) : (
          <>
            {/* Metadata & Architectural Role */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Classification
                </span>
                <button
                  onClick={copyPath}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy Path"}</span>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Architectural Role:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-mono border border-indigo-500/30 font-semibold">
                    {details.architectural_role || "Unknown"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                  <span>{details.language}</span>
                  <span>{details.line_count} lines</span>
                  <span>{Math.round(details.file_size / 1024)} KB</span>
                </div>
              </div>
            </div>

            {/* Functions Detected */}
            {details.functions.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-sky-400" />
                    <span>Functions & Methods</span>
                  </span>
                  <span className="text-slate-400 font-mono font-normal">({details.functions.length})</span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {details.functions.map((fn, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-slate-300 font-mono text-[11px]"
                    >
                      <span className="truncate text-sky-300">{fn.name}()</span>
                      <span className="text-[10px] text-slate-500">L{fn.lines}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Classes Detected */}
            {details.classes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-violet-400" />
                    <span>Classes & Interfaces</span>
                  </span>
                  <span className="text-slate-400 font-mono font-normal">({details.classes.length})</span>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {details.classes.map((cls, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-slate-300 font-mono text-[11px]"
                    >
                      <span className="truncate text-violet-300">{cls.name}</span>
                      <span className="text-[10px] text-slate-500">L{cls.lines}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incoming Dependencies (Imported By) */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Imported By</span>
                </span>
                <span className="text-slate-400 font-mono font-normal">
                  ({details.incoming_dependencies.length})
                </span>
              </div>
              {details.incoming_dependencies.length === 0 ? (
                <div className="text-slate-500 italic text-[11px] p-2 bg-slate-900/40 rounded-lg border border-slate-800/50">
                  No incoming imports detected.
                </div>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {details.incoming_dependencies.map((dep, i) => {
                    const path = typeof dep === "string" ? dep : dep.file_path;
                    const rel = typeof dep === "object" ? dep.relationship_type : "imports";
                    const line = typeof dep === "object" ? dep.evidence_line : undefined;
                    return (
                      <div
                        key={i}
                        onClick={() => onSelectRelatedFile && onSelectRelatedFile(path)}
                        className="text-slate-300 bg-slate-900/60 px-2 py-1.5 rounded-lg truncate border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-[11px] font-mono group"
                      >
                        <span className="truncate group-hover:text-indigo-300">{path}</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/40">
                            {rel}
                          </span>
                          {line && <span className="text-[9px] text-slate-500">L{line}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Outgoing Dependencies (Imports) */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Imports</span>
                </span>
                <span className="text-slate-400 font-mono font-normal">
                  ({details.outgoing_dependencies.length})
                </span>
              </div>
              {details.outgoing_dependencies.length === 0 ? (
                <div className="text-slate-500 italic text-[11px] p-2 bg-slate-900/40 rounded-lg border border-slate-800/50">
                  No outgoing dependencies.
                </div>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {details.outgoing_dependencies.map((dep, i) => {
                    const path = typeof dep === "string" ? dep : dep.file_path;
                    const rel = typeof dep === "object" ? dep.relationship_type : "imports";
                    const line = typeof dep === "object" ? dep.evidence_line : undefined;
                    return (
                      <div
                        key={i}
                        onClick={() => onSelectRelatedFile && onSelectRelatedFile(path)}
                        className="text-slate-300 bg-slate-900/60 px-2 py-1.5 rounded-lg truncate border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-[11px] font-mono group"
                      >
                        <span className="truncate group-hover:text-indigo-300">{path}</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/40">
                            {rel}
                          </span>
                          {line && <span className="text-[9px] text-slate-500">L{line}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Source Code Preview */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Code Preview
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed text-slate-300 whitespace-pre">
                {details.preview}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer action */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0">
        <button
          onClick={() => onOpenFullCode(filePath)}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open in Full Code Viewer</span>
        </button>
      </div>
    </div>
  );
}
