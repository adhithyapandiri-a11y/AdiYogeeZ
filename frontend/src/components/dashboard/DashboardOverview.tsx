"use client";

import React from "react";
import Link from "next/link";
import { 
  FileCode2, 
  Code, 
  Box, 
  Layers, 
  GitBranch, 
  Star, 
  GitFork, 
  Sparkles, 
  ArrowRight, 
  History, 
  Compass, 
  ShieldAlert, 
  MessageSquareCode,
  Network,
  Cpu,
  Calendar
} from "lucide-react";
import { Repository } from "@/lib/types";

interface DashboardOverviewProps {
  repo: Repository;
  onSelectQuestion: (question: string) => void;
}

export default function DashboardOverview({ repo, onSelectQuestion }: DashboardOverviewProps) {
  const statsCards = [
    {
      label: "Indexed Files",
      value: repo.file_count,
      icon: FileCode2,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      label: "Detected Functions",
      value: repo.function_count,
      icon: Code,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20"
    },
    {
      label: "Detected Classes",
      value: repo.class_count,
      icon: Box,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20"
    },
    {
      label: "Internal Dependencies",
      value: repo.dependency_count,
      icon: GitFork,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      label: "Architecture Modules",
      value: repo.module_count,
      icon: Layers,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      label: "Languages Detected",
      value: repo.languages ? Object.keys(repo.languages).length : 1,
      icon: Cpu,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20"
    }
  ];

  const suggestedQuestions = [
    "Explain the overall system architecture and design patterns.",
    "Where is the primary entry point and request router?",
    "How does authentication and state management work?",
    "Which files should I inspect to understand the core database schema?"
  ];

  const moduleShortcuts = [
    {
      title: "Obsidian Architecture Explorer",
      desc: "Interactive constellation map with force-directed physics and file inspector.",
      href: `/workspace/${repo.id}/architecture`,
      icon: Network,
      color: "text-violet-400"
    },
    {
      title: "RepoMind Grounded Chat",
      desc: "Natural-language Q&A strictly grounded in indexed AST code excerpts.",
      href: `/workspace/${repo.id}/chat`,
      icon: MessageSquareCode,
      color: "text-indigo-400"
    },
    {
      title: "Execution Path Explorer",
      desc: "Trace callers and callees to understand function relationship chains.",
      href: `/workspace/${repo.id}/execution-path`,
      icon: GitFork,
      color: "text-cyan-400"
    },
    {
      title: "Codebase Time Machine",
      desc: "Git commit timelines, real diffs, and Gemini-powered commit explanations.",
      href: `/workspace/${repo.id}/time-machine`,
      icon: History,
      color: "text-emerald-400"
    },
    {
      title: "Contribution Assistant",
      desc: "Turn issues into structured contribution roadmaps with target file checklists.",
      href: `/workspace/${repo.id}/contribution`,
      icon: Compass,
      color: "text-amber-400"
    },
    {
      title: "Impact Analyzer",
      desc: "Calculate blast radius and ripple breaking risks for proposed changes.",
      href: `/workspace/${repo.id}/impact`,
      icon: ShieldAlert,
      color: "text-rose-400"
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#090d16] text-slate-100">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Repo Header Hero */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#0f172a] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {repo.owner} / <span className="text-indigo-400">{repo.name}</span>
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                  {repo.primary_language || "Codebase"}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{repo.stars.toLocaleString()} stars</span>
                </span>
                <span className="flex items-center space-x-1">
                  <GitFork className="w-3.5 h-3.5 text-slate-400" />
                  <span>{repo.forks.toLocaleString()} forks</span>
                </span>
                <span className="flex items-center space-x-1">
                  <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                  <span>branch: {repo.default_branch || "main"}</span>
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              {repo.description || "Open-source repository indexed and analyzed by RepoMind."}
            </p>

            <div className="flex items-center space-x-3 pt-2 text-xs text-slate-500">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Last Indexed: {repo.indexed_at ? new Date(repo.indexed_at).toLocaleString() : "Just now"}
                </span>
              </span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Intelligence Vector Index</span>
              </span>
            </div>
          </div>
        </div>

        {/* 6 Statistics Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsCards.map((st, idx) => {
            const Icon = st.icon;
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl bg-[#0f172a]/80 border ${st.border} shadow-lg space-y-2`}
              >
                <div className={`w-8 h-8 rounded-xl ${st.bg} flex items-center justify-center ${st.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-slate-100">{st.value}</div>
                  <div className="text-[11px] text-slate-400 font-medium truncate">{st.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Suggested Codebase Questions */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>Suggested Repository Questions (Click to Ask RepoMind AI)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onSelectQuestion(q)}
                className="text-left p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-violet-500/30 text-xs text-slate-200 transition-all flex items-center justify-between group"
              >
                <span className="truncate pr-2">{q}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Quick Access to 6 Modules */}
        <div className="space-y-4">
          <h2 className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
            Explore Repository Intelligence
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleShortcuts.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={idx}
                  href={mod.href}
                  className="p-5 rounded-2xl bg-[#0f172a]/80 hover:bg-slate-900 border border-white/5 hover:border-white/15 shadow-xl transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-slate-800/80 group-hover:bg-slate-700/80 transition-colors">
                        <Icon className={`w-4 h-4 ${mod.color}`} />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {mod.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-indigo-400 font-semibold pt-2">
                    <span>Launch Module</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
