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
  ChevronRight
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
    <div className="flex h-[calc(100vh-3.5rem)] bg-[#090d16] text-slate-100">
      {/* Commits Timeline Column */}
      <div className="w-96 border-r border-white/10 bg-[#0c121e]/90 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <History className="w-4 h-4 text-violet-400" />
            <span>Commit History</span>
          </div>
          <span className="text-[11px] text-slate-500">{commits.length} commits</span>
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {commits.map((c) => {
            const isSelected = selectedSha === c.sha;
            return (
              <button
                key={c.sha}
                onClick={() => handleSelectCommit(c.sha)}
                className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col space-y-2 border ${
                  isSelected
                    ? "bg-violet-600/20 border-violet-500/40 text-slate-100 shadow-md shadow-violet-500/5"
                    : "bg-[#0f172a]/60 hover:bg-slate-800/80 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-indigo-400">
                    {c.sha}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : ""}
                  </span>
                </div>

                <div className="font-medium text-slate-200 line-clamp-2 leading-relaxed">
                  {c.message}
                </div>

                <div className="flex items-center space-x-2 text-[10px] text-slate-500 pt-1 border-t border-white/5">
                  <User className="w-3 h-3" />
                  <span className="truncate">{c.author}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Diff & Explanation Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loadingDiff ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            <span>Loading commit metadata and diffs...</span>
          </div>
        ) : diffDetails ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Commit Header Card */}
            <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono text-xs font-semibold border border-indigo-500/20">
                    {diffDetails.sha.slice(0, 8)}
                  </span>
                  <span className="text-xs text-slate-400">
                    by <strong className="text-slate-200">{diffDetails.author}</strong> on {new Date(diffDetails.date).toLocaleString()}
                  </span>
                </div>

                {/* AI Explain Button */}
                <button
                  onClick={handleExplain}
                  disabled={explaining}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{explaining ? "Analyzing with Gemini..." : "Explain This Commit"}</span>
                </button>
              </div>

              <h2 className="text-base font-semibold text-slate-100 leading-relaxed font-sans">
                {diffDetails.message}
              </h2>

              {/* Stats badges */}
              <div className="flex items-center space-x-4 pt-2 border-t border-white/5 text-xs text-slate-400">
                <span>{diffDetails.files.length} changed files</span>
                <span className="flex items-center text-emerald-400">
                  <Plus className="w-3 h-3 mr-0.5" /> {diffDetails.stats.additions || 0} additions
                </span>
                <span className="flex items-center text-rose-400">
                  <Minus className="w-3 h-3 mr-0.5" /> {diffDetails.stats.deletions || 0} deletions
                </span>
              </div>
            </div>

            {/* AI Explanation Result Card */}
            {aiExplanation && (
              <div className="p-5 rounded-2xl bg-gradient-to-tr from-violet-950/30 to-indigo-950/20 border border-violet-500/30 shadow-2xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 text-xs font-semibold text-violet-300">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>RepoMind AI Commit Breakdown</span>
                </div>
                <div className="prose prose-invert prose-xs text-slate-200 leading-relaxed font-sans">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiExplanation}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Files & Diffs */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Changed Files ({diffDetails.files.length})
              </h3>

              {diffDetails.files.map((file, idx) => (
                <div key={idx} className="rounded-xl bg-[#0f172a] border border-white/10 overflow-hidden shadow-lg">
                  {/* File Header */}
                  <div className="px-4 py-2.5 bg-slate-900 border-b border-white/5 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-200 font-medium flex items-center space-x-2">
                      <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{file.filename}</span>
                    </span>
                    <div className="flex items-center space-x-2 font-mono text-[11px]">
                      <span className="text-emerald-400">+{file.additions}</span>
                      <span className="text-rose-400">-{file.deletions}</span>
                    </div>
                  </div>

                  {/* Patch / Code Diff */}
                  {file.patch ? (
                    <div className="p-3 bg-[#090d16] font-mono text-[11px] overflow-x-auto leading-relaxed">
                      {file.patch.split("\n").map((line, lIdx) => {
                        const isAdd = line.startsWith("+");
                        const isDel = line.startsWith("-");
                        const isHeader = line.startsWith("@@");

                        return (
                          <div
                            key={lIdx}
                            className={`px-2 py-0.2 ${
                              isAdd
                                ? "bg-emerald-500/10 text-emerald-300"
                                : isDel
                                ? "bg-rose-500/10 text-rose-300"
                                : isHeader
                                ? "text-violet-400 bg-violet-500/5 font-semibold"
                                : "text-slate-400"
                            }`}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-slate-500 italic">Binary or large file diff omitted.</div>
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
