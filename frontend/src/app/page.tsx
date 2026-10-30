"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  ArrowRight, 
  GitBranch, 
  Network, 
  MessageSquareCode, 
  GitFork, 
  History, 
  Compass, 
  ShieldAlert, 
  CheckCircle2, 
  Cpu, 
  Layers, 
  Terminal, 
  FileCode, 
  Orbit,
  ExternalLink,
  ChevronRight,
  Code2
} from "lucide-react";
import ConnectRepoModal from "@/components/common/ConnectRepoModal";
import { getRepositories } from "@/lib/api";
import { Repository } from "@/lib/types";

export default function LandingPage() {
  const router = useRouter();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [recentRepos, setRecentRepos] = useState<Repository[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<"obsidian" | "chat" | "path" | "impact">("obsidian");

  useEffect(() => {
    getRepositories()
      .then(setRecentRepos)
      .catch((err) => console.error("Error fetching repos:", err));
  }, []);

  const modules = [
    {
      title: "RepoMind AI",
      badge: "Grounded RAG",
      desc: "Conversational codebase intelligence strictly grounded in source code excerpts, citing exact file paths and lines.",
      icon: MessageSquareCode,
      color: "from-indigo-500 to-violet-500"
    },
    {
      title: "Architecture Explorer",
      badge: "Obsidian Cosmos",
      desc: "Interactive force-directed graph with directory hubs, file nodes sized by connectivity, and satellite functions.",
      icon: Orbit,
      color: "from-violet-500 to-purple-500"
    },
    {
      title: "Execution Path Explorer",
      badge: "Call Graph",
      desc: "Traces incoming callers and downstream invocations across files to map functional relationships.",
      icon: GitFork,
      color: "from-cyan-500 to-blue-500"
    },
    {
      title: "Codebase Time Machine",
      badge: "Git History",
      desc: "Inspect commit histories, file diffs, and receive AI-generated architectural summaries grounded in changes.",
      icon: History,
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Contribution Assistant",
      badge: "Issue Roadmaps",
      desc: "Converts unfamiliar GitHub issues into actionable, step-by-step contribution checklists with target files.",
      icon: Compass,
      color: "from-amber-500 to-orange-500"
    },
    {
      title: "Impact Analyzer",
      badge: "Blast Radius",
      desc: "Static dependency blast radius estimator categorized into High, Medium, and Low potential impact tiers.",
      icon: ShieldAlert,
      color: "from-rose-500 to-pink-500"
    }
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
            RepoMind
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {recentRepos.length > 0 && (
            <Link
              href={`/workspace/${recentRepos[0].id}`}
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
            >
              <span>Latest: {recentRepos[0].name}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            onClick={() => setConnectModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Connect Repository</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 text-center overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-violet-600/15 to-transparent blur-[120px] rounded-full pointer-events-none -z-10"></div>

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>AI Codebase Intelligence & Obsidian Constellation Mapping</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.15]">
            Understand Any Codebase. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              Instantly.
            </span>
          </h1>

          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Your AI-powered companion for exploring, understanding and contributing to open-source software. Navigate complex architectures with interactive graph galaxies and grounded reasoning.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setConnectModalOpen(true)}
              className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:opacity-95 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
            >
              <span>Explore a Repository</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#preview"
              className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-white/10 transition-colors"
            >
              <span>See How It Works</span>
            </a>
          </div>

          {/* Quick Demo Chips */}
          {recentRepos.length > 0 && (
            <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Jump into indexed project:</span>
              {recentRepos.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  href={`/workspace/${r.id}`}
                  className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 font-mono transition-colors"
                >
                  {r.owner}/{r.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Interactive Platform Preview Section */}
      <section id="preview" className="py-12 px-6 max-w-6xl mx-auto w-full">
        <div className="rounded-3xl bg-[#0c121e] border border-white/10 shadow-2xl overflow-hidden">
          {/* Mock Window Titlebar */}
          <div className="h-12 bg-[#0f172a] border-b border-white/10 px-4 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              <span className="text-slate-400 font-mono text-[11px] ml-2">RepoMind Workspace Preview</span>
            </div>

            {/* Preview Tabs */}
            <div className="flex items-center space-x-1 p-1 rounded-lg bg-slate-900 border border-white/5 text-[11px]">
              <button
                onClick={() => setActivePreviewTab("obsidian")}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  activePreviewTab === "obsidian" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Constellation Graph
              </button>
              <button
                onClick={() => setActivePreviewTab("chat")}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  activePreviewTab === "chat" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Grounded AI Chat
              </button>
              <button
                onClick={() => setActivePreviewTab("path")}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  activePreviewTab === "path" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Execution Path
              </button>
              <button
                onClick={() => setActivePreviewTab("impact")}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  activePreviewTab === "impact" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Impact Analyzer
              </button>
            </div>
          </div>

          {/* Interactive Preview Canvas */}
          <div className="p-8 min-h-[380px] bg-[#090d16] flex items-center justify-center">
            {activePreviewTab === "obsidian" && (
              <div className="w-full max-w-2xl text-center space-y-4">
                <div className="inline-flex items-center space-x-2 text-violet-400 text-xs font-semibold uppercase tracking-wider">
                  <Orbit className="w-4 h-4 text-violet-400" />
                  <span>Obsidian-Style Graph View</span>
                </div>
                <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 space-y-4">
                  <div className="flex items-center justify-center space-x-6 py-6">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-violet-600/80 border-2 border-violet-400 flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <span className="text-[10px] font-bold">/api</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Directory Hub</span>
                    </div>

                    <div className="w-16 h-[2px] bg-gradient-to-r from-violet-500 to-blue-500"></div>

                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-9 h-9 rounded-full bg-blue-500 border border-blue-300 flex items-center justify-center shadow-md">
                        <FileCode className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[11px] text-slate-400">auth.ts</span>
                    </div>

                    <div className="w-12 h-[1px] bg-slate-600"></div>

                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center shadow-sm">
                        <span className="text-[8px] font-bold text-slate-900">f()</span>
                      </div>
                      <span className="text-[11px] text-slate-400">verify()</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Organic force-directed physics, hover focus highlighting (fades unrelated nodes), level-of-detail zoom, and click-to-inspect code viewer.
                  </p>
                </div>
              </div>
            )}

            {activePreviewTab === "chat" && (
              <div className="w-full max-w-2xl space-y-3">
                <div className="p-4 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-xs text-slate-200 self-end">
                  "Explain how JWT token authentication and session middleware work in this repository."
                </div>
                <div className="p-4 rounded-xl bg-[#0f172a] border border-white/10 text-xs text-slate-300 space-y-2">
                  <div className="text-slate-200 leading-relaxed">
                    Authentication is initialized in <span className="font-mono text-indigo-300 bg-slate-900 px-1 py-0.5 rounded border border-white/5">[src/middleware/auth.ts:24-48]</span>. Inbound requests pass through <span className="font-mono text-cyan-300">verifyBearerToken()</span> which validates the HMAC signature before attaching the user payload to the session context.
                  </div>
                  <div className="flex items-center space-x-2 pt-2 border-t border-white/5 text-[11px] text-violet-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Evidence grounded in 2 source excerpts</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === "path" && (
              <div className="w-full max-w-2xl space-y-3 text-center">
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  Call Chain Hierarchy
                </div>
                <div className="flex items-center justify-center space-x-3 text-xs font-mono">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
                    handleCheckout()
                  </span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                  <span className="px-3 py-1.5 rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 font-bold">
                    processPayment()
                  </span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
                    PaymentGateway.charge()
                  </span>
                </div>
              </div>
            )}

            {activePreviewTab === "impact" && (
              <div className="w-full max-w-2xl space-y-3">
                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider text-center">
                  Blast Radius: "Refactor database query connection pool"
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    <div className="font-bold">HIGH (3 Files)</div>
                    <div className="text-[11px] text-slate-400 mt-1">db/client.ts, userModel.ts</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    <div className="font-bold">MEDIUM (5 Files)</div>
                    <div className="text-[11px] text-slate-400 mt-1">authService.ts, orderApi.ts</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800 border border-white/5 text-slate-400">
                    <div className="font-bold text-slate-300">LOW (2 Files)</div>
                    <div className="text-[11px] text-slate-500 mt-1">test/db.test.ts</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-16 px-6 bg-[#0c121e]/50 border-y border-white/5">
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100">
            The Codebase Onboarding Bottleneck
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            When developers join an unfamiliar project or try to contribute to open-source software, they spend considerable time deciphering folder structures, tracing function execution paths, and figuring out where changes won't cause regressions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-5 rounded-2xl bg-[#0f172a] border border-white/5 space-y-2">
              <div className="text-rose-400 font-semibold text-sm">Fragmented Context</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generic AI chatbots lack full repository structure, hallucinate fake APIs, and miss cross-file import connections.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0f172a] border border-white/5 space-y-2">
              <div className="text-amber-400 font-semibold text-sm">Invisible Call Chains</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Static grep misses caller-callee hierarchies, making it risky to refactor methods without hidden ripple breaks.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0f172a] border border-white/5 space-y-2">
              <div className="text-indigo-400 font-semibold text-sm">High Barrier to Contribute</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                New contributors struggle to know which files to touch first to resolve open GitHub issues safely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Modules Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center space-y-3">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Comprehensive Developer Toolkit
          </div>
          <h2 className="text-3xl font-bold text-slate-100">
            Six Specialized Repository Intelligence Modules
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto">
            All modules share a unified AST parsing, relationship extraction, and vector embedding engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0f172a]/80 border border-white/10 hover:border-white/20 shadow-xl space-y-4 flex flex-col justify-between transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${m.color} flex items-center justify-center text-white shadow-lg`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {m.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {m.desc}
                  </p>
                </div>

                <button
                  onClick={() => setConnectModalOpen(true)}
                  className="self-start text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 pt-2 transition-colors"
                >
                  <span>Explore Feature</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="py-16 px-6 bg-[#0c121e]/60 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
            Powered by Production Architecture
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
              Next.js 14+ (App Router)
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
              FastAPI & Async Python
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
              Tree-sitter AST Multi-Language
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
              Google Gemini 2.5 Flash
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
              D3-Force & React Flow
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
              SQLite & Vector Indexing
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-[#090d16] py-8 px-6 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="font-bold text-slate-300">RepoMind</span>
            <span>— Understand Any Codebase. Navigate Any Complexity.</span>
          </div>
          <div>
            Production-grade developer platform • All analysis strictly grounded in source code.
          </div>
        </div>
      </footer>

      {/* Connect Repo Modal */}
      <ConnectRepoModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={(repoId) => router.push(`/workspace/${repoId}`)}
      />
    </div>
  );
}
