"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Brain,
  Play,
  Pause,
  SplitSquareVertical,
  Columns,
  Maximize2
} from "lucide-react";
import { getCommits, getCommitDiff, explainCommit, getObsidianGraph } from "@/lib/api";
import { RepoCommit, CommitDiffResponse, ObsidianGraphData } from "@/lib/types";
import ObsidianConstellationGraph from "@/components/architecture/ObsidianConstellationGraph";

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

  // Neural Network graph data for the repository
  const [neuralGraphData, setNeuralGraphData] = useState<ObsidianGraphData | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);

  // Display mode: "split" (Neural Map + Diff side-by-side) | "neural" (Full Brain Map) | "diff" (Full Diff)
  const [activeTab, setActiveTab] = useState<"split" | "neural" | "diff">("split");

  // Play Timeline feature
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load commits and repository neural network on mount
  useEffect(() => {
    getCommits(repoId).then((data) => {
      setCommits(data);
      if (data.length > 0) {
        handleSelectCommit(data[0].sha);
      }
    });

    setLoadingGraph(true);
    getObsidianGraph(repoId)
      .then(setNeuralGraphData)
      .catch((err) => console.error("Failed to load neural graph for Time Machine:", err))
      .finally(() => setLoadingGraph(false));
  }, [repoId]);

  // Clean up playback on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

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

  // Timeline scrubber playback
  const togglePlayTimeline = () => {
    if (isPlaying) {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      let currentIndex = commits.findIndex((c) => c.sha === selectedSha);
      if (currentIndex === -1 || currentIndex <= 0) {
        currentIndex = commits.length - 1; // start from oldest commit
      }

      playIntervalRef.current = setInterval(() => {
        if (currentIndex < 0) {
          clearInterval(playIntervalRef.current!);
          setIsPlaying(false);
          return;
        }
        const commit = commits[currentIndex];
        if (commit) {
          handleSelectCommit(commit.sha);
        }
        currentIndex--;
      }, 2600);
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
    <div className="flex h-[calc(100vh-3.5rem)] bg-[#090d16] text-slate-100 overflow-hidden">
      {/* 1. Left Commits Timeline Column */}
      <div className="w-80 border-r border-white/10 bg-[#0c121e]/90 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <History className="w-4 h-4 text-violet-400" />
            <span>Commit History</span>
          </div>
          
          {/* Play Timeline Button */}
          <button
            onClick={togglePlayTimeline}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border ${
              isPlaying
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10"
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? "Pause" : "Play Timeline"}</span>
          </button>
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {commits.map((c) => {
            const isSelected = selectedSha === c.sha;
            return (
              <button
                key={c.sha}
                onClick={() => handleSelectCommit(c.sha)}
                className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col space-y-2 border ${
                  isSelected
                    ? "bg-gradient-to-r from-violet-600/25 via-indigo-600/15 to-transparent border-violet-500/50 text-slate-100 shadow-md shadow-violet-500/10 ring-1 ring-violet-500/30"
                    : "bg-[#0f172a]/60 hover:bg-slate-800/80 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-indigo-400 flex items-center space-x-1">
                    <GitCommit className="w-3 h-3 text-indigo-400" />
                    <span>{c.sha.slice(0, 7)}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : ""}
                  </span>
                </div>

                <div className="font-medium text-slate-200 line-clamp-2 leading-relaxed">
                  {c.message}
                </div>

                <div className="flex items-center space-x-2 text-[10px] text-slate-500 pt-1 border-t border-white/5">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{c.author}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Central View Area (Dual Mode: Neural Map & Diff Inspector) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top View Selector Bar */}
        <div className="h-12 border-b border-white/10 bg-[#0c121e]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 font-mono">View Mode:</span>
            <div className="flex items-center space-x-1 p-0.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setActiveTab("split")}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === "split"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split (Brain + Diff)</span>
              </button>

              <button
                onClick={() => setActiveTab("neural")}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === "neural"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-violet-300" />
                <span>Neural Activity Map</span>
              </button>

              <button
                onClick={() => setActiveTab("diff")}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === "diff"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-sky-300" />
                <span>Diff Inspector</span>
              </button>
            </div>
          </div>

          {diffDetails && (
            <div className="flex items-center space-x-4 text-xs font-mono">
              <span className="text-slate-400">
                Commit: <strong className="text-indigo-300">{diffDetails.sha.slice(0, 8)}</strong>
              </span>
              <span className="text-emerald-400 font-semibold">+{diffDetails.stats.additions || 0}</span>
              <span className="text-rose-400 font-semibold">-{diffDetails.stats.deletions || 0}</span>
            </div>
          )}
        </div>

        {/* Dynamic Display Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* A. NEURAL NETWORK REPOSITORY BRAIN VIEW */}
          {(activeTab === "split" || activeTab === "neural") && (
            <div className={`relative h-full ${activeTab === "split" ? "w-1/2 border-r border-white/10" : "w-full"}`}>
              {loadingGraph ? (
                <div className="w-full h-full flex items-center justify-center bg-[#080c15] text-slate-400 font-mono text-xs">
                  Loading repository neural network...
                </div>
              ) : neuralGraphData ? (
                <ObsidianConstellationGraph
                  data={neuralGraphData}
                  commitFiles={diffDetails?.files || []}
                  selectedCommitSha={selectedSha}
                  isTimeMachineMode={true}
                  onSelectNode={(node) => {
                    // Scroll diff into view if file clicked
                    if (node.path) {
                      const el = document.getElementById(`diff-file-${node.path}`);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                  No neural network data available.
                </div>
              )}
            </div>
          )}

          {/* B. DIFF DETAILS & AI EXPLANATION COLUMN */}
          {(activeTab === "split" || activeTab === "diff") && (
            <div className={`h-full overflow-y-auto p-6 space-y-6 ${activeTab === "split" ? "w-1/2" : "w-full"}`}>
              {loadingDiff ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-mono">
                  <span>Loading commit changes and unified patches...</span>
                </div>
              ) : diffDetails ? (
                <div className="max-w-3xl mx-auto space-y-5">
                  {/* Commit Info Card */}
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

                    <h2 className="text-sm font-semibold text-slate-100 leading-relaxed font-mono">
                      {diffDetails.message}
                    </h2>

                    {/* Stats badges */}
                    <div className="flex items-center space-x-4 pt-2 border-t border-white/5 text-xs text-slate-400 font-mono">
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
                    <div className="p-5 rounded-2xl bg-gradient-to-tr from-violet-950/40 to-indigo-950/30 border border-violet-500/40 shadow-2xl space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-violet-300 font-mono">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span>RepoMind AI Commit Breakdown</span>
                      </div>
                      <div className="prose prose-invert prose-xs text-slate-200 leading-relaxed font-sans">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiExplanation}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Changed Files & Diffs */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                      Touched Files in Commit ({diffDetails.files.length})
                    </h3>

                    {diffDetails.files.map((file, idx) => (
                      <div 
                        key={idx} 
                        id={`diff-file-${file.filename}`}
                        className="rounded-xl bg-[#0f172a] border border-white/10 overflow-hidden shadow-lg"
                      >
                        {/* File Header */}
                        <div className="px-4 py-2.5 bg-slate-900 border-b border-white/5 flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-200 font-medium flex items-center space-x-2">
                            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{file.filename}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                              file.status === "added" ? "bg-emerald-500/20 text-emerald-300" :
                              file.status === "removed" ? "bg-rose-500/20 text-rose-300" :
                              "bg-amber-500/20 text-amber-300"
                            }`}>
                              {file.status}
                            </span>
                          </span>
                          <div className="flex items-center space-x-2 font-mono text-[11px]">
                            <span className="text-emerald-400">+{file.additions}</span>
                            <span className="text-rose-400">-{file.deletions}</span>
                          </div>
                        </div>

                        {/* Patch / Code Diff */}
                        {file.patch ? (
                          <div className="p-3 bg-[#080c15] font-mono text-[11px] overflow-x-auto leading-relaxed">
                            {file.patch.split("\n").map((line, lIdx) => {
                              const isAdd = line.startsWith("+");
                              const isDel = line.startsWith("-");
                              const isHeader = line.startsWith("@@");

                              return (
                                <div
                                  key={lIdx}
                                  className={`px-2 py-0.5 rounded ${
                                    isAdd
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : isDel
                                      ? "bg-rose-500/15 text-rose-300"
                                      : isHeader
                                      ? "text-violet-400 bg-violet-500/10 font-semibold"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {line}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 text-xs text-slate-500 italic font-mono">
                            Binary or non-textual modification omitted.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
