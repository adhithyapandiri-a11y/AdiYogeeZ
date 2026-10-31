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
  Calendar,
  Orbit,
  ArrowUpRight
} from "lucide-react";
import { Repository } from "@/lib/types";

interface DashboardOverviewProps {
  repo: Repository;
  onSelectQuestion: (question: string) => void;
}

export default function DashboardOverview({ repo, onSelectQuestion }: DashboardOverviewProps) {
  const statsCards = [
    {
      num: "01",
      label: "INDEXED FILES",
      value: repo.file_count,
      icon: FileCode2,
    },
    {
      num: "02",
      label: "FUNCTIONS",
      value: repo.function_count,
      icon: Code,
    },
    {
      num: "03",
      label: "CLASSES",
      value: repo.class_count,
      icon: Box,
    },
    {
      num: "04",
      label: "DEPENDENCIES",
      value: repo.dependency_count,
      icon: GitFork,
    },
    {
      num: "05",
      label: "MODULE HUBS",
      value: repo.module_count,
      icon: Layers,
    },
    {
      num: "06",
      label: "LANGUAGES",
      value: repo.languages ? Object.keys(repo.languages).length : 1,
      icon: Cpu,
    }
  ];

  const suggestedQuestions = [
    "Explain the overall system architecture and key design patterns.",
    "Where is the primary entry point and request router?",
    "How does authentication, authorization, or state management work?",
    "Which files should I inspect to understand core database entities?"
  ];

  const moduleShortcuts = [
    {
      num: "01",
      title: "Architecture Explorer",
      tag: "COSMOS GRAPH",
      desc: "Interactive force-directed graph with directory hubs and satellite functions.",
      href: `/workspace/${repo.id}/architecture`,
      icon: Orbit,
    },
    {
      num: "02",
      title: "RepoMind Grounded Chat",
      tag: "GROUNDED RAG",
      desc: "Natural-language Q&A strictly grounded in indexed AST code excerpts.",
      href: `/workspace/${repo.id}/chat`,
      icon: MessageSquareCode,
    },
    {
      num: "03",
      title: "Execution Path Explorer",
      tag: "CALL GRAPH",
      desc: "Trace callers and callees to understand function relationship chains.",
      href: `/workspace/${repo.id}/execution-path`,
      icon: GitFork,
    },
    {
      num: "04",
      title: "Codebase Time Machine",
      tag: "GIT DIFFS",
      desc: "Git commit timelines, real diffs, and Gemini-powered commit explanations.",
      href: `/workspace/${repo.id}/time-machine`,
      icon: History,
    },
    {
      num: "05",
      title: "Contribution Assistant",
      tag: "ISSUE ROADMAPS",
      desc: "Turn issues into structured contribution roadmaps with target file checklists.",
      href: `/workspace/${repo.id}/contribution`,
      icon: Compass,
    },
    {
      num: "06",
      title: "Impact Analyzer",
      tag: "BLAST RADIUS",
      desc: "Calculate blast radius and ripple breaking risks for proposed changes.",
      href: `/workspace/${repo.id}/impact`,
      icon: ShieldAlert,
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#0d0d0d] text-zinc-100 vsk-grid-bg-subtle">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Repo Header Bento Hero */}
        <div className="p-8 rounded-3xl bg-[#141414] border border-[#262626] shadow-[0_15px_35px_rgba(0,0,0,0.7)] relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-black font-mono tracking-tight text-white uppercase">
                  {repo.owner} / <span className="text-[#f54e26]">{repo.name}</span>
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-[#1c1c1c] text-zinc-300 border border-[#2e2e2e] font-mono">
                  {repo.primary_language || "Codebase"}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs font-mono text-zinc-400">
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#181818] border border-[#262626]">
                  <Star className="w-3.5 h-3.5 text-[#f9bf28] fill-[#f9bf28]" />
                  <span>{repo.stars.toLocaleString()} stars</span>
                </span>
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#181818] border border-[#262626]">
                  <GitFork className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{repo.forks.toLocaleString()} forks</span>
                </span>
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#181818] border border-[#262626]">
                  <GitBranch className="w-3.5 h-3.5 text-[#f54e26]" />
                  <span>{repo.default_branch || "main"}</span>
                </span>
              </div>
            </div>

            <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed font-sans">
              {repo.description || "Open-source repository indexed and analyzed by RepoMind."}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono text-zinc-500 border-t border-[#1e1e1e]">
              <span className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>
                  Last Indexed: {repo.indexed_at ? new Date(repo.indexed_at).toLocaleString() : "Active"}
                </span>
              </span>
              <span>•</span>
              <span className="text-[#00a86b] flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse"></span>
                <span>Active AST Vector & Call-Graph Index</span>
              </span>
            </div>
          </div>
        </div>

        {/* 6 Statistics Cards Grid (VSK Bento Style) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsCards.map((st, idx) => {
            const Icon = st.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#141414] border border-[#262626] hover:border-[#f54e26]/50 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">[ {st.num} ]</span>
                  <Icon className="w-4 h-4 text-zinc-400 group-hover:text-[#f54e26] transition-colors" />
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-white group-hover:text-[#f54e26] transition-colors">
                    {st.value}
                  </div>
                  <div className="text-[10px] font-mono font-semibold text-zinc-500 tracking-wider truncate pt-1">
                    {st.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Suggested Codebase Questions */}
        <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-white uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#f54e26]" />
              <span>// REPOSITORY PROMPTS (CLICK TO QUERY REPOMIND AI)</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">GROUNDED REASONING</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onSelectQuestion(q)}
                className="text-left p-4 rounded-2xl bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#f54e26]/50 text-xs text-zinc-300 hover:text-white transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3 pr-2">
                  <span className="text-[10px] font-mono text-[#f54e26] font-bold shrink-0">
                    [0{idx+1}]
                  </span>
                  <span className="font-sans line-clamp-1">{q}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-[#f54e26] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Intelligence Module Shortcuts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              // REPOSITORY INTELLIGENCE WORKSPACES
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {moduleShortcuts.map((m, idx) => {
              const Icon = m.icon;
              return (
                <Link
                  key={idx}
                  href={m.href}
                  className="p-6 rounded-2xl bg-[#141414] border border-[#242424] hover:border-[#f54e26]/50 shadow-md space-y-4 flex flex-col justify-between transition-all group hover:-translate-y-1"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#f54e26] font-bold">
                        [ {m.num} ]
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1c1c1c] text-zinc-400 border border-[#2b2b2b]">
                        {m.tag}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-[#181818] border border-[#2a2a2a] flex items-center justify-center text-[#f54e26] group-hover:bg-[#f54e26] group-hover:text-white transition-all">
                      <Icon className="w-5 h-5" />
                    </div>

                    <h3 className="text-sm font-bold font-mono text-white group-hover:text-[#f54e26] transition-colors uppercase">
                      {m.title}
                    </h3>

                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      {m.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono text-zinc-500">
                    <span>Launch</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#f54e26] group-hover:translate-x-1 transition-transform" />
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
