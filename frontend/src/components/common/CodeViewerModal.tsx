"use client";

import React, { useState, useEffect, useRef } from "react";
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
  onClose,
}: CodeViewerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!filePath) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, [filePath]);
  const [data, setData] = useState<FileContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!filePath) return;
    let current = true;
    setLoading(true);
    setData(null);
    setError("");
    getFileContent(repoId, filePath)
      .then((res) => {
        if (current) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (current) {
          setError(
            err instanceof Error ? err.message : "Could not load source.",
          );
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [repoId, filePath, retry]);

  if (!filePath) return null;

  const handleCopy = () => {
    if (!data?.content) return;
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = data?.content ? data.content.split("\n") : [];

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Source of ${filePath}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
        if (event.key === "Tab") {
          const items = modalRef.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          );
          if (!items?.length) return;
          const first = items[0],
            last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-5xl h-[85vh] bg-[#141414] border border-[#2a2a2a] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-[#242424] bg-[#181818] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-8 h-8 rounded-full bg-[#1c1c1c] border border-[#2c2c2c] flex items-center justify-center text-[#f54e26]">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold font-mono text-white flex items-center space-x-2">
                <span>{filePath}</span>
                {targetLineStart && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f54e26]/10 text-[#f54e26] border border-[#f54e26]/30 font-mono">
                    L{targetLineStart}
                    {targetLineEnd && targetLineEnd !== targetLineStart
                      ? `-${targetLineEnd}`
                      : ""}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                {data
                  ? `${data.language} • ${data.line_count} lines • ${data.symbols.length} detected symbols`
                  : "Loading AST symbols..."}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#202020] hover:bg-[#282828] text-xs font-mono font-medium text-zinc-300 border border-[#2e2e2e] transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#00a86b]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span>{copied ? "Copied" : "Copy Source"}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close source viewer"
              ref={closeRef}
              className="p-2 rounded-full hover:bg-[#202020] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content Body */}
        <div className="flex-1 overflow-auto bg-[#0d0d0d] font-mono text-xs">
          {error ? (
            <div role="alert" className="space-y-3 p-8 text-[#ff623d]">
              <p>{error}</p>
              <button
                className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-200 hover:border-zinc-500"
                onClick={() => setRetry((n) => n + 1)}
              >
                Retry source
              </button>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center text-zinc-400 font-mono text-xs">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-[#f54e26] animate-ping"></span>
                <span>Retrieving source file excerpts...</span>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {lines.map((line, idx) => {
                const lineNo = idx + 1;
                const isTarget =
                  targetLineStart && targetLineEnd
                    ? lineNo >= targetLineStart && lineNo <= targetLineEnd
                    : lineNo === targetLineStart;

                return (
                  <div
                    key={idx}
                    className={`flex items-start px-6 py-0.5 transition-colors ${
                      isTarget
                        ? "bg-[#f54e26]/15 border-l-2 border-[#f54e26] text-white"
                        : "hover:bg-[#161616] text-zinc-300"
                    }`}
                  >
                    <span className="w-12 shrink-0 select-none text-zinc-600 text-right pr-4 font-mono">
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
          <div className="h-12 px-6 border-t border-[#222222] bg-[#141414] flex items-center space-x-2.5 overflow-x-auto text-[11px] font-mono text-zinc-400 shrink-0">
            <span className="text-zinc-500 uppercase font-semibold text-[10px] tracking-wider shrink-0">
              AST SYMBOLS:
            </span>
            {data.symbols.map((sym, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full bg-[#1c1c1c] text-zinc-300 border border-[#2b2b2b] whitespace-nowrap shrink-0 flex items-center space-x-1"
              >
                <span className="text-[#f54e26]">
                  {sym.symbol_type}:
                </span>{" "}
                <span className="text-white font-medium">{sym.name}</span>
                <span className="text-zinc-500">(L{sym.start_line})</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
