"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, FileCode, ExternalLink, Code } from "lucide-react";
import { getFileContent } from "@/lib/api";
import { FileContentResponse } from "@/lib/types";

interface CodeViewerModalProps {
  repoId: number;
  filePath: string | null;
  targetLineStart?: number;
  targetLineEnd?: number;
  onClose: () => void;
}

export default function CodeViewerModal({
  repoId,
  filePath,
  targetLineStart,
  targetLineEnd,
  onClose
}: CodeViewerModalProps) {
  const [data, setData] = useState<FileContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    getFileContent(repoId, filePath)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load file:", err);
        setLoading(false);
      });
  }, [repoId, filePath]);

  if (!filePath) return null;

  const handleCopy = () => {
    if (!data?.content) return;
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = data?.content ? data.content.split("\n") : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[85vh] bg-[#0c121e] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-5 border-b border-white/10 bg-[#0f172a]/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                <span>{filePath}</span>
                {targetLineStart && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono">
                    L{targetLineStart}{targetLineEnd && targetLineEnd !== targetLineStart ? `-${targetLineEnd}` : ""}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {data ? `${data.language} • ${data.line_count} lines • ${data.symbols.length} detected symbols` : "Loading..."}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-white/5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? "Copied" : "Copy Code"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content Body */}
        <div className="flex-1 overflow-auto bg-[#090d16] font-mono text-xs">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                <span>Retrieving source file...</span>
              </div>
            </div>
          ) : (
            <div className="py-3">
              {lines.map((line, idx) => {
                const lineNo = idx + 1;
                const isTarget = targetLineStart && targetLineEnd 
                  ? lineNo >= targetLineStart && lineNo <= targetLineEnd 
                  : lineNo === targetLineStart;

                return (
                  <div
                    key={idx}
                    className={`flex items-start px-4 py-0.5 transition-colors ${
                      isTarget 
                        ? "bg-indigo-600/20 border-l-2 border-indigo-400 text-indigo-100" 
                        : "hover:bg-slate-800/30 text-slate-300"
                    }`}
                  >
                    <span className="w-12 shrink-0 select-none text-slate-600 text-right pr-4">
                      {lineNo}
                    </span>
                    <pre className="whitespace-pre overflow-x-auto font-mono flex-1 leading-relaxed">
                      {line || " "}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with detected symbols */}
        {data && data.symbols.length > 0 && (
          <div className="h-10 px-4 border-t border-white/10 bg-[#0f172a]/80 flex items-center space-x-2 overflow-x-auto text-[11px] text-slate-400 shrink-0">
            <span className="text-slate-500 uppercase font-semibold text-[10px] tracking-wider shrink-0">
              Symbols:
            </span>
            {data.symbols.map((sym, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-white/5 whitespace-nowrap shrink-0"
              >
                <span className="text-indigo-400 font-mono">{sym.symbol_type}:</span> {sym.name} (L{sym.start_line})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
