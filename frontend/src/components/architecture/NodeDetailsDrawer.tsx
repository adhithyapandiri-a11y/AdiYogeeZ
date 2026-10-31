"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileCode,
  Folder,
  Code,
  Box,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Copy,
  Check,
  Tag,
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
  onSelectRelatedFile,
}: NodeDetailsDrawerProps) {
  const [details, setDetails] = useState<NodeDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!filePath) return;
    let current = true;
    setLoading(true);
    setDetails(null);
    setError("");
    getNodeDetails(repoId, filePath)
      .then((data) => {
        if (current) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (current) {
          setError(
            err instanceof Error ? err.message : "Could not load file details.",
          );
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [repoId, filePath, retry]);

  if (!filePath) return null;

  const copyPath = () => {
    navigator.clipboard.writeText(filePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="complementary"
      aria-label="File inspector"
      className="absolute top-0 right-0 h-full w-[420px] max-w-full z-30 bg-[#121212]/95 border-l border-[#242424] backdrop-blur-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#242424] flex items-center justify-between shrink-0 bg-[#161616]">
        <div className="flex items-center space-x-3 truncate">
          <div className="p-2 rounded-full bg-[#1c1c1c] text-[#f54e26] border border-[#2a2a2a]">
            {details?.is_directory ? (
              <Folder className="w-4 h-4 shrink-0 text-[#f54e26]" />
            ) : (
              <FileCode className="w-4 h-4 shrink-0 text-[#f54e26]" />
            )}
          </div>
          <div className="truncate">
            <span className="font-bold text-sm text-white truncate block font-mono">
              {filePath.split("/").pop()}
            </span>
            <span className="text-[10px] text-zinc-400 truncate block font-mono">
              {filePath}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close file inspector"
          className="p-1.5 rounded-full hover:bg-[#202020] text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
        {error ? (
          <div role="alert" className="space-y-3 p-4 text-xs text-[#ff623d]">
            <p>{error}</p>
            <button
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
              onClick={() => setRetry((n) => n + 1)}
            >
              Retry file details
            </button>
          </div>
        ) : loading || !details ? (
          <div className="h-40 flex items-center justify-center text-zinc-500">
            <span className="text-xs">
              Loading node architecture details...
            </span>
          </div>
        ) : (
          <>
            {/* Metadata & Architectural Role */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                  Classification
                </span>
                <button
                  onClick={copyPath}
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-[#f54e26] transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-[#00a86b]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? "Copied" : "Copy Path"}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#181818] border border-[#282828] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">
                    Architectural Role:
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#1c1c1c] text-[#f54e26] border border-[#2a2a2a] font-bold">
                    {details.architectural_role || "Unknown"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1.5 border-t border-[#222222]">
                  <span>{details.language}</span>
                  <span>{details.line_count} lines</span>
                  <span>{Math.round(details.file_size / 1024)} KB</span>
                </div>
              </div>
            </div>

            {/* Contained Files for Directory Hub */}
            {details.contained_files && details.contained_files.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-[#f54e26]" />
                    <span>Files in Directory</span>
                  </span>
                  <span className="text-zinc-500 font-normal">
                    ({details.contained_files.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {details.contained_files.map((file, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectRelatedFile && onSelectRelatedFile(file.file_path)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#181818] border border-[#282828] hover:border-[#f54e26]/50 hover:bg-[#202020] cursor-pointer text-zinc-300 text-[11px] group transition-all"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FileCode className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#f54e26] shrink-0" />
                        <span className="truncate group-hover:text-white">{file.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 shrink-0">{file.lines} lines</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Functions Detected */}
            {details.functions.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-[#f9bf28]" />
                    <span>Functions & Methods</span>
                  </span>
                  <span className="text-zinc-500 font-normal">
                    ({details.functions.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {details.functions.map((fn, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#181818] border border-[#282828] text-zinc-300 text-[11px]"
                    >
                      <span className="truncate text-white">{fn.name}()</span>
                      <span className="text-[10px] text-zinc-500">
                        L{fn.lines}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Classes Detected */}
            {details.classes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-[#f54e26]" />
                    <span>Classes & Interfaces</span>
                  </span>
                  <span className="text-zinc-500 font-normal">
                    ({details.classes.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {details.classes.map((cls, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#181818] border border-[#282828] text-zinc-300 text-[11px]"
                    >
                      <span className="truncate text-white">
                        {cls.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        L{cls.lines}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incoming Dependencies (Imported By) */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-[#00a86b]" />
                  <span>Imported By</span>
                </span>
                <span className="text-zinc-500 font-normal">
                  ({details.incoming_dependencies.length})
                </span>
              </div>
              {details.incoming_dependencies.length === 0 ? (
                <div className="text-zinc-500 italic text-[11px] p-2.5 bg-[#181818] rounded-xl border border-[#242424]">
                  No incoming imports detected.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {details.incoming_dependencies.map((dep, i) => {
                    const path = typeof dep === "string" ? dep : dep.file_path;
                    const rel =
                      typeof dep === "object"
                        ? dep.relationship_type
                        : "imports";
                    const line =
                      typeof dep === "object" ? dep.evidence_line : undefined;
                    return (
                      <div
                        key={i}
                        onClick={() =>
                          onSelectRelatedFile && onSelectRelatedFile(path)
                        }
                        className="text-zinc-300 bg-[#181818] px-3 py-2 rounded-xl truncate border border-[#282828] hover:border-[#f54e26]/50 hover:bg-[#202020] cursor-pointer flex items-center justify-between text-[11px] group transition-all"
                      >
                        <span className="truncate group-hover:text-white">
                          {path}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#1c1c1c] text-[#f54e26] border border-[#2e2e2e]">
                            {rel}
                          </span>
                          {line && (
                            <span className="text-[9px] text-zinc-500">
                              L{line}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Outgoing Dependencies (Imports) */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#f54e26]" />
                  <span>Imports</span>
                </span>
                <span className="text-zinc-500 font-normal">
                  ({details.outgoing_dependencies.length})
                </span>
              </div>
              {details.outgoing_dependencies.length === 0 ? (
                <div className="text-zinc-500 italic text-[11px] p-2.5 bg-[#181818] rounded-xl border border-[#242424]">
                  No outgoing dependencies.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {details.outgoing_dependencies.map((dep, i) => {
                    const path = typeof dep === "string" ? dep : dep.file_path;
                    const rel =
                      typeof dep === "object"
                        ? dep.relationship_type
                        : "imports";
                    const line =
                      typeof dep === "object" ? dep.evidence_line : undefined;
                    return (
                      <div
                        key={i}
                        onClick={() =>
                          onSelectRelatedFile && onSelectRelatedFile(path)
                        }
                        className="text-zinc-300 bg-[#181818] px-3 py-2 rounded-xl truncate border border-[#282828] hover:border-[#f54e26]/50 hover:bg-[#202020] cursor-pointer flex items-center justify-between text-[11px] group transition-all"
                      >
                        <span className="truncate group-hover:text-white">
                          {path}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#1c1c1c] text-[#f54e26] border border-[#2e2e2e]">
                            {rel}
                          </span>
                          {line && (
                            <span className="text-[9px] text-zinc-500">
                              L{line}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Source Code Preview */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                Code Preview
              </div>
              <div className="p-3 rounded-2xl bg-[#0d0d0d] border border-[#222222] text-[11px] max-h-48 overflow-y-auto leading-relaxed text-zinc-300 whitespace-pre">
                {details.preview}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer action */}
      <div className="p-4 border-t border-[#242424] bg-[#161616] shrink-0">
        <button
          onClick={() => {
            const targetPath = (details?.is_directory && details.contained_files && details.contained_files.length > 0)
              ? details.contained_files[0].file_path
              : filePath;
            onOpenFullCode(targetPath);
          }}
          className="w-full py-3 px-4 rounded-full bg-[#f54e26] hover:bg-[#ff623d] text-white font-mono font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-[#f54e26]/20 transition-all cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{details?.is_directory ? "Inspect Directory Source" : "Open in Full Code Viewer"}</span>
        </button>
      </div>
    </div>
  );
}
