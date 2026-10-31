"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  History, 
  GitCommit, 
  User, 
  Calendar, 
  FileCode, 
  Sparkles, 
  Plus, 
  Minus, 
  Bot,
  ExternalLink,
  ChevronRight,
  ArrowUpRight
} from "lucide-react";
import { getCommits, getCommitDiff, explainCommit } from "@/lib/api";
import { RepoCommit, CommitDiffResponse } from "@/lib/types";

interface TimeMachineViewProps {
  repoId: number;
}

export default function TimeMachineView({ repoId }: TimeMachineViewProps) {
  const [commits, setCommits] = useState<RepoCommit[]>([]);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [diffDetails, setDiffDetails] = useState<CommitDiffResponse | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    getCommits(repoId).then((data) => {
      setCommits(data);
      if (data.length > 0) {
        handleSelectCommit(data[0].sha);
      }
    });
  }, [repoId]);

  const handleSelectCommit = async (sha: string) => {
    setSelectedSha(sha);
    setLoadingDiff(true);
    setAiExplanation(null);
    try {
      const details = await getCommitDiff(repoId, sha);
      setDiffDetails(details);
    } catch (err) {
      console.error("Failed to load commit diff:", err);
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleExplain = async () => {
    if (!diffDetails) return;
    setExplaining(true);
    try {
      const diffSummary = diffDetails.files
        .map((f) => `File: ${f.filename} (+${f.additions}/-${f.deletions})\n${f.patch || ""}`)
        .join("\n\n");
      const resp = await explainCommit(repoId, diffDetails.sha, diffSummary, diffDetails.message);
      setAiExplanation(resp);
    } catch (err: any) {
      setAiExplanation("Failed to generate AI commit summary: " + err.message);
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0d0d0d] text-zinc-100 vsk-grid-bg-subtle select-none">
      {/* Commits Timeline Column */}
      <div className="w-96 border-r border-[#222222] bg-[#0d0d0d] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#222222] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-white uppercase tracking-wider">
            <History className="w-4 h-4 text-[#f54e26]" />
            <span>Commit History</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181818] border border-[#262626] text-zinc-400">
            {commits.length} commits
          </span>
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {commits.map((c) => {
            const isSelected = selectedSha === c.sha;
            return (
              <button
                key={c.sha}
                onClick={() => handleSelectCommit(c.sha)}
                className={`w-full text-left p-3.5 rounded-2xl text-xs transition-all flex flex-col space-y-2 border cursor-pointer ${
                  isSelected
                    ? "bg-[#f54e26]/10 border-[#f54e26]/50 text-white shadow-md"
                    : "bg-[#141414] hover:bg-[#1a1a1a] border-[#242424] text-zinc-400 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[11px] font-bold ${
                    isSelected ? "text-[#f54e26]" : "text-zinc-300"
                  }`}>
                    {c.sha}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : ""}
                  </span>
                </div>

                <div className="font-sans font-medium text-zinc-200 line-clamp-2 leading-relaxed">
                  {c.message}
                </div>

                <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-500 pt-1 border-t border-[#1e1e1e]">
                  <User className="w-3 h-3 text-zinc-500" />
                  <span className="truncate">{c.author}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Diff & Explanation Panel */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {loadingDiff ? (
          <div className="h-64 flex items-center justify-center text-zinc-500 text-xs font-mono">
            <span>Loading commit metadata and AST diffs...</span>
          </div>
        ) : diffDetails ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Commit Header Card */}
            <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 rounded-full bg-[#1c1c1c] text-[#f54e26] font-mono text-xs font-bold border border-[#2e2e2e]">
                    {diffDetails.sha.slice(0, 8)}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    by <strong className="text-white">{diffDetails.author}</strong> on {new Date(diffDetails.date).toLocaleString()}
                  </span>
                </div>

                {/* AI Explain Button */}
                <button
                  onClick={handleExplain}
                  disabled={explaining}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[#f54e26] hover:bg-[#ff623d] disabled:opacity-40 text-white text-xs font-mono font-semibold shadow-[0_0_15px_rgba(245,78,38,0.3)] transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-white" />
                  <span>{explaining ? "Analyzing with Gemini..." : "Explain This Commit"}</span>
                </button>
              </div>

              <h2 className="text-lg font-bold text-white leading-relaxed font-sans">
                {diffDetails.message}
              </h2>

              {/* Stats badges */}
              <div className="flex items-center space-x-4 pt-3 border-t border-[#1e1e1e] text-xs font-mono text-zinc-400">
                <span>{diffDetails.files.length} changed files</span>
                <span className="flex items-center text-[#00a86b]">
                  <Plus className="w-3 h-3 mr-0.5" /> {diffDetails.stats.additions || 0} additions
                </span>
                <span className="flex items-center text-[#f54e26]">
                  <Minus className="w-3 h-3 mr-0.5" /> {diffDetails.stats.deletions || 0} deletions
                </span>
              </div>
            </div>

            {/* AI Explanation Result Card */}
            {aiExplanation && (
              <div className="p-7 rounded-3xl bg-[#181818] border border-[#f54e26]/30 shadow-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-[#f54e26] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#f54e26] fill-[#f54e26]" />
                  <span>RepoMind AI Commit Breakdown</span>
                </div>
                <div className="prose prose-invert prose-xs text-zinc-200 leading-relaxed font-sans">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiExplanation}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Files & Diffs */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                Changed Files ({diffDetails.files.length})
              </h3>

              {diffDetails.files.map((file, idx) => (
                <div key={idx} className="rounded-2xl bg-[#141414] border border-[#262626] overflow-hidden shadow-lg">
                  {/* File Header */}
                  <div className="px-5 py-3 bg-[#181818] border-b border-[#242424] flex items-center justify-between text-xs">
                    <span className="font-mono text-white font-medium flex items-center space-x-2">
                      <FileCode className="w-3.5 h-3.5 text-[#f54e26]" />
                      <span>{file.filename}</span>
                    </span>
                    <div className="flex items-center space-x-3 font-mono text-[11px]">
                      <span className="text-[#00a86b]">+{file.additions}</span>
                      <span className="text-[#f54e26]">-{file.deletions}</span>
                    </div>
                  </div>

                  {/* Patch / Code Diff */}
                  {file.patch ? (
                    <div className="p-4 bg-[#0d0d0d] font-mono text-[11px] overflow-x-auto leading-relaxed">
                      {file.patch.split("\n").map((line, lIdx) => {
                        const isAdd = line.startsWith("+");
                        const isDel = line.startsWith("-");
                        const isHeader = line.startsWith("@@");

                        return (
                          <div
                            key={lIdx}
                            className={`px-2 py-0.5 ${
                              isAdd
                                ? "bg-[#00a86b]/10 text-[#00a86b]"
                                : isDel
                                ? "bg-[#f54e26]/10 text-[#ff623d]"
                                : isHeader
                                ? "text-zinc-400 bg-[#1a1a1a] font-semibold"
                                : "text-zinc-400"
                            }`}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-xs font-mono text-zinc-500 italic">Binary or large file diff omitted.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
