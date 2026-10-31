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
  Code2,
  Zap,
  Activity,
  ArrowUpRight
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

  const tickerItems = [
    "AST PARSING & RELATIONS",
    "OBSIDIAN CONSTELLATION GRAPH",
    "CALL GRAPH TRACING",
    "STATIC BLAST RADIUS ESTIMATION",
    "GROUNDED RAG REASONING",
    "CODEBASE TIME MACHINE",
    "GITHUB ISSUE ROADMAPS",
    "ZERO HALLUCINATIONS"
  ];

  const modules = [
    {
      num: "01",
      title: "RepoMind AI",
      tag: "GROUNDED RAG",
      desc: "Conversational codebase intelligence strictly grounded in parsed AST code excerpts, citing verified file paths and exact line ranges.",
      icon: MessageSquareCode,
      highlight: "Direct Source Citations",
      route: "chat"
    },
    {
      num: "02",
      title: "Architecture Explorer",
      tag: "OBSIDIAN COSMOS",
      desc: "Interactive force-directed graph with directory hubs, file nodes sized by connectivity, and satellite functions in dynamic 2D/3D physics.",
      icon: Orbit,
      highlight: "3D Force-Directed Galaxy & 30s Tour",
      route: "architecture"
    },
    {
      num: "03",
      title: "Execution Path",
      tag: "CALL GRAPH",
      desc: "Traces incoming callers and downstream invocations across files to map functional relationships and call hierarchies.",
      icon: GitFork,
      highlight: "Multi-Hop Traversal",
      route: "execution-path"
    },
    {
      num: "04",
      title: "Codebase Time Machine",
      tag: "GIT ARCHAEOLOGY",
      desc: "Inspect commit histories, interactive diffs, and receive architectural summaries grounded in changes across commits.",
      icon: History,
      highlight: "Commit Diff Synthesis",
      route: "time-machine"
    },
    {
      num: "05",
      title: "Contribution Assistant",
      tag: "ISSUE ROADMAPS",
      desc: "Converts unfamiliar GitHub issues into actionable, step-by-step contribution checklists with target files and functions to modify.",
      icon: Compass,
      highlight: "Automated Onboarding & Draft Patch",
      route: "contribution"
    },
    {
      num: "06",
      title: "Impact Analyzer",
      tag: "BLAST RADIUS",
      desc: "Static dependency blast radius estimator categorized into High, Medium, and Low potential impact tiers before merging PRs.",
      icon: ShieldAlert,
      highlight: "Regression Prevention",
      route: "impact"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-zinc-100 flex flex-col selection:bg-[#f54e26]/30 selection:text-white vsk-grid-bg relative overflow-x-hidden">
      
      {/* Top Floating VSK Navigation Bar */}
      <div className="sticky top-4 z-50 px-4 sm:px-6 w-full max-w-7xl mx-auto">
        <header className="h-16 rounded-full border border-[#262626] bg-[#121212]/90 backdrop-blur-xl px-5 sm:px-7 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-full bg-[#f54e26] flex items-center justify-center text-white shadow-[0_0_15px_rgba(245,78,38,0.4)] group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 fill-white" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-extrabold text-base tracking-tight text-white uppercase font-mono">
                RepoMind
              </span>
              <span className="text-[10px] font-mono font-medium text-neutral-500 uppercase tracking-widest hidden sm:inline">
                • V1.0
              </span>
            </div>
          </Link>

          {/* Center Status Pill */}
          <div className="hidden md:flex items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#181818] border border-[#2b2b2b] text-[11px] font-mono text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#f54e26] animate-pulse"></span>
              <span className="tracking-wider uppercase">ALL SYSTEMS ACTIVE • AST READY</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {recentRepos.length > 0 && (
              <Link
                href={`/workspace/${recentRepos[0].id}`}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#181818] border border-[#2c2c2c] hover:border-zinc-500 text-xs text-zinc-300 font-mono transition-colors"
              >
                <span className="text-neutral-500">[RECENT]</span>
                <span className="truncate max-w-[120px] font-semibold">{recentRepos[0].name}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#f54e26]" />
              </Link>
            )}

            <button
              onClick={() => setConnectModalOpen(true)}
              className="flex items-center space-x-2 px-4 sm:px-5 py-2 rounded-full bg-[#f54e26] hover:bg-[#ff623d] text-white font-semibold text-xs tracking-wide shadow-[0_0_20px_rgba(245,78,38,0.35)] transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Connect Repo</span>
            </button>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 text-center overflow-hidden max-w-6xl mx-auto w-full">
        {/* Ambient Orange Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[360px] bg-[radial-gradient(ellipse_at_center,rgba(245,78,38,0.15),transparent_70%)] blur-[100px] pointer-events-none -z-10"></div>

        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181818] border border-[#282828] text-[#f54e26] text-xs font-mono font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#f54e26]"></span>
            <span className="tracking-wider uppercase text-zinc-300">
              NEXT-GEN CODEBASE INTELLIGENCE PLATFORM
            </span>
          </div>

          {/* VSK Style Punchy Condensed Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-[-0.03em] uppercase text-white leading-[1.05]">
            Understand Any Codebase. <br />
            <span className="text-[#f54e26]">
              Navigate Any Complexity.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
            RepoMind maps entire repositories into force-directed architecture galaxies, traces cross-file execution chains, and delivers AI answers strictly grounded in source code.
          </p>

          {/* Hero CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/workspace/${recentRepos[0]?.id || 4}`}
              className="flex items-center space-x-2 px-7 py-3.5 rounded-full bg-[#f54e26] hover:bg-[#ff623d] text-white font-semibold text-sm shadow-[0_0_25px_rgba(245,78,38,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-white" />
              <span>Launch Live Codebase Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setConnectModalOpen(true)}
              className="flex items-center space-x-2 px-7 py-3.5 rounded-full bg-[#181818] hover:bg-[#202020] text-zinc-200 font-medium text-sm border border-[#2b2b2b] hover:border-zinc-500 transition-all cursor-pointer"
            >
              <GitBranch className="w-4 h-4 text-[#f54e26]" />
              <span>Connect Any GitHub Repo</span>
            </button>
          </div>

          {/* Pre-indexed Repos Quick Launch */}
          {recentRepos.length > 0 && (
            <div className="pt-8 flex flex-col items-center justify-center gap-3 text-xs">
              <span className="text-zinc-500 font-mono uppercase text-[11px] tracking-wider">
                Instant One-Click Workspace Demos:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {recentRepos.map((r) => (
                  <Link
                    key={r.id}
                    href={`/workspace/${r.id}`}
                    className="px-3.5 py-1.5 rounded-full bg-[#141414] border border-[#262626] hover:border-[#f54e26] text-zinc-300 hover:text-white font-mono transition-all flex items-center space-x-2 group shadow-sm hover:shadow-[0_0_15px_rgba(245,78,38,0.2)]"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#00a86b]"></span>
                    <span className="font-semibold text-white">{r.owner}/{r.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#202020] text-zinc-400 border border-[#2e2e2e]">
                      {r.primary_language || "Code"}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-[#f54e26] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Infinite Ticker Bar (Signature VSK Design element) */}
      <div className="w-full border-y border-[#222222] bg-[#121212]/80 backdrop-blur-md py-3 overflow-hidden select-none my-8">
        <div className="animate-vsk-marquee">
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} className="flex items-center mx-6 space-x-4 shrink-0 font-mono text-xs font-semibold tracking-wider text-zinc-400">
              <span className="text-[#f54e26] font-bold">[ + ]</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Platform Preview Section (Bento Showcase) */}
      <section id="preview" className="py-12 px-6 max-w-6xl mx-auto w-full">
        <div className="rounded-3xl bg-[#141414] border border-[#262626] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Mock Window Header */}
          <div className="h-14 bg-[#181818] border-b border-[#262626] px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-[#f54e26]"></div>
                <div className="w-3 h-3 rounded-full bg-[#f9bf28]"></div>
                <div className="w-3 h-3 rounded-full bg-[#00a86b]"></div>
              </div>
              <span className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider ml-2">
                RepoMind Engine // Interactive Inspector
              </span>
            </div>

            {/* Preview Tabs */}
            <div className="flex items-center space-x-1 p-1 rounded-full bg-[#111111] border border-[#262626] text-[11px] font-mono">
              <button
                onClick={() => setActivePreviewTab("obsidian")}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  activePreviewTab === "obsidian" 
                    ? "bg-[#f54e26] text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Constellation
              </button>
              <button
                onClick={() => setActivePreviewTab("chat")}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  activePreviewTab === "chat" 
                    ? "bg-[#f54e26] text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Grounded Chat
              </button>
              <button
                onClick={() => setActivePreviewTab("path")}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  activePreviewTab === "path" 
                    ? "bg-[#f54e26] text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Execution Path
              </button>
              <button
                onClick={() => setActivePreviewTab("impact")}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  activePreviewTab === "impact" 
                    ? "bg-[#f54e26] text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Blast Radius
              </button>
            </div>
          </div>

          {/* Interactive Preview Canvas */}
          <div className="p-8 md:p-12 min-h-[380px] bg-[#0d0d0d] flex items-center justify-center">
            {activePreviewTab === "obsidian" && (
              <div className="w-full max-w-2xl text-center space-y-6">
                <div className="inline-flex items-center space-x-2 text-[#f54e26] text-xs font-mono uppercase tracking-wider">
                  <Orbit className="w-4 h-4 text-[#f54e26]" />
                  <span>[ 01 ] OBSIDIAN-INSPIRED CODE GRAPH</span>
                </div>
                
                <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-5">
                  <div className="flex items-center justify-center space-x-6 py-6">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-14 h-14 rounded-full bg-[#1e1e1e] border-2 border-[#f54e26] flex items-center justify-center shadow-[0_0_20px_rgba(245,78,38,0.3)]">
                        <span className="text-[11px] font-mono font-bold text-white">/api</span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">Directory Hub</span>
                    </div>

                    <div className="w-16 h-[2px] bg-gradient-to-r from-[#f54e26] to-[#f9bf28]"></div>

                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-11 h-11 rounded-full bg-[#1a1a1a] border border-[#f9bf28] flex items-center justify-center shadow-md">
                        <FileCode className="w-4 h-4 text-[#f9bf28]" />
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">auth.ts</span>
                    </div>

                    <div className="w-12 h-[1px] bg-zinc-700"></div>

                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-8 h-8 rounded-full bg-[#202020] border border-zinc-600 flex items-center justify-center shadow-sm">
                        <span className="text-[9px] font-mono font-bold text-zinc-300">f()</span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">verify()</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-lg mx-auto">
                    Organic D3 force-directed physics, directory clustering, satellite function nodes, and instant click-to-view source code modals.
                  </p>

                  <div className="pt-2">
                    <Link
                      href={`/workspace/${recentRepos[0]?.id || 4}/architecture`}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#f54e26] hover:bg-[#ff623d] text-white text-xs font-mono font-semibold transition-all shadow-md shadow-[#f54e26]/30 cursor-pointer"
                    >
                      <Orbit className="w-3.5 h-3.5" />
                      <span>Launch 3D Constellation & 30s Guided Tour</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === "chat" && (
              <div className="w-full max-w-2xl space-y-4">
                <div className="inline-flex items-center space-x-2 text-[#f54e26] text-xs font-mono uppercase tracking-wider">
                  <MessageSquareCode className="w-4 h-4 text-[#f54e26]" />
                  <span>[ 02 ] REPOMIND RAG QUERY ENGINE</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#1e1e1e] border border-[#2b2b2b] text-xs text-zinc-200">
                  <span className="text-zinc-500 font-mono mr-2">Q:</span>
                  "Explain how JWT token authentication and session middleware work in this repository."
                </div>

                <div className="p-5 rounded-2xl bg-[#141414] border border-[#262626] text-xs text-zinc-300 space-y-3">
                  <div className="text-zinc-300 leading-relaxed font-sans">
                    Authentication is initialized in <span className="font-mono text-[#f54e26] bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#2a2a2a]">[src/middleware/auth.ts:24-48]</span>. Inbound requests pass through <span className="font-mono text-zinc-100">verifyBearerToken()</span> which validates the HMAC signature before attaching the user payload to the session context.
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#222222] text-[11px] text-[#00a86b] font-mono">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00a86b]" />
                      <span>Evidence grounded in 2 verified AST code excerpts</span>
                    </div>
                    <Link
                      href={`/workspace/${recentRepos[0]?.id || 4}/chat`}
                      className="text-xs text-[#f54e26] hover:text-[#ff623d] flex items-center space-x-1 font-semibold"
                    >
                      <span>Open Live Chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === "path" && (
              <div className="w-full max-w-2xl space-y-4 text-center">
                <div className="inline-flex items-center space-x-2 text-[#f54e26] text-xs font-mono uppercase tracking-wider">
                  <GitFork className="w-4 h-4 text-[#f54e26]" />
                  <span>[ 03 ] INTER-FUNCTION CALL HIERARCHY</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono py-4">
                  <span className="px-3.5 py-2 rounded-xl bg-[#141414] border border-[#282828] text-zinc-300">
                    handleCheckout()
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#f54e26]" />
                  <span className="px-3.5 py-2 rounded-xl bg-[#f54e26]/10 border border-[#f54e26]/40 text-[#f54e26] font-bold">
                    processPayment()
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#f54e26]" />
                  <span className="px-3.5 py-2 rounded-xl bg-[#141414] border border-[#282828] text-zinc-300">
                    PaymentGateway.charge()
                  </span>
                </div>

                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Maps incoming callers and downstream function invocations to isolate breaking paths before refactoring.
                </p>

                <div className="pt-2">
                  <Link
                    href={`/workspace/${recentRepos[0]?.id || 4}/execution-path`}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#f54e26]/60 text-white text-xs font-mono font-semibold transition-all shadow-md cursor-pointer"
                  >
                    <GitFork className="w-3.5 h-3.5 text-[#f54e26]" />
                    <span>Trace Call Graphs in Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {activePreviewTab === "impact" && (
              <div className="w-full max-w-2xl space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 text-[#f54e26] text-xs font-mono uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-[#f54e26]" />
                    <span>[ 04 ] STATIC BLAST RADIUS ESTIMATION</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-4 rounded-2xl bg-[#181818] border border-[#f54e26]/30 space-y-1">
                    <div className="font-bold text-[#f54e26] flex items-center justify-between">
                      <span>HIGH IMPACT</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f54e26]/10">3 Files</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-sans pt-1">db/client.ts, userModel.ts</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#181818] border border-[#f9bf28]/30 space-y-1">
                    <div className="font-bold text-[#f9bf28] flex items-center justify-between">
                      <span>MEDIUM IMPACT</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f9bf28]/10">5 Files</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-sans pt-1">authService.ts, orderApi.ts</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#181818] border border-[#00a86b]/30 space-y-1">
                    <div className="font-bold text-[#00a86b] flex items-center justify-between">
                      <span>LOW IMPACT</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00a86b]/10">2 Files</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-sans pt-1">test/db.test.ts</div>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <Link
                    href={`/workspace/${recentRepos[0]?.id || 4}/impact`}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#f54e26]/60 text-white text-xs font-mono font-semibold transition-all shadow-md cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#f54e26]" />
                    <span>Analyze Change Impact & Blast Radius</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The Codebase Onboarding Bottleneck (VSK Editorial Section) */}
      <section className="py-20 px-6 border-y border-[#1e1e1e] bg-[#111111]/60">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-[#f54e26]">
              // THE DEVELOPER PAIN POINT
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase text-white">
              The Codebase Onboarding Bottleneck
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Developers waste up to 40% of their engineering hours deciphering unfamiliar project layouts, hunting down caller paths, and fearing ripple regressions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-7 rounded-2xl bg-[#161616] border border-[#262626] hover:border-zinc-500 transition-all space-y-3 group">
              <span className="text-xs font-mono text-[#f54e26]">[ 01 ]</span>
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wide">
                Fragmented Context
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Generic AI chatbots hallucinate non-existent API endpoints and lack persistent cross-file AST knowledge graphs.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#161616] border border-[#262626] hover:border-zinc-500 transition-all space-y-3 group">
              <span className="text-xs font-mono text-[#f54e26]">[ 02 ]</span>
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wide">
                Invisible Call Chains
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Traditional grep misses caller-callee hierarchies, making it perilous to refactor shared methods without breaking consumers.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#161616] border border-[#262626] hover:border-zinc-500 transition-all space-y-3 group">
              <span className="text-xs font-mono text-[#f54e26]">[ 03 ]</span>
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wide">
                High Contribution Barrier
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Open-source contributors struggle to identify the exact files and function anchors needed to solve issues safely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Six Intelligence Modules Bento Grid */}
      <section className="py-24 px-6 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-[#f54e26]">
            // ARCHITECTURAL CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase text-white">
            Six Specialized Intelligence Modules
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto">
            Unified under a shared AST engine, static call-graph parser, and vector embedding pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, idx) => {
            const Icon = m.icon;
            const targetUrl = `/workspace/${recentRepos[0]?.id || 4}/${m.route}`;
            return (
              <Link
                key={idx}
                href={targetUrl}
                className="p-7 rounded-2xl bg-[#141414] border border-[#242424] hover:border-[#f54e26]/60 shadow-xl space-y-5 flex flex-col justify-between transition-all group hover:-translate-y-1 cursor-pointer block hover:shadow-[0_10px_30px_rgba(245,78,38,0.15)]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#f54e26] font-bold">
                      [ {m.num} ]
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#1e1e1e] border border-[#2b2b2b] text-zinc-300">
                      {m.tag}
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-[#1c1c1c] border border-[#2c2c2c] flex items-center justify-center text-[#f54e26] group-hover:bg-[#f54e26] group-hover:text-white transition-all shadow-md">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-bold text-white font-mono uppercase tracking-tight group-hover:text-[#f54e26] transition-colors">
                    {m.title}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {m.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500 text-[11px]">{m.highlight}</span>
                  <div className="text-[#f54e26] flex items-center space-x-1 group-hover:translate-x-1 transition-transform font-semibold">
                    <span>Launch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Production Architecture Specs */}
      <section className="py-16 px-6 bg-[#111111]/80 border-t border-[#222222]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            ENGINEERING SPECIFICATIONS
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-300 font-mono">
            <span className="px-4 py-2 rounded-full bg-[#161616] border border-[#282828]">
              Next.js 16 (Turbopack)
            </span>
            <span className="px-4 py-2 rounded-full bg-[#161616] border border-[#282828]">
              FastAPI & Async Python
            </span>
            <span className="px-4 py-2 rounded-full bg-[#161616] border border-[#282828]">
              Tree-sitter AST Multi-Language
            </span>
            <span className="px-4 py-2 rounded-full bg-[#161616] border border-[#282828]">
              Google Gemini 2.5 Flash
            </span>
            <span className="px-4 py-2 rounded-full bg-[#161616] border border-[#282828]">
              D3-Force & React Flow
            </span>
            <span className="px-4 py-2 rounded-full bg-[#161616] border border-[#282828]">
              SQLite Vector Indexing
            </span>
          </div>
        </div>
      </section>

      {/* VSK Minimalist Editorial Footer */}
      <footer className="border-t border-[#222222] bg-[#0d0d0d] py-10 px-6 text-xs text-zinc-500 font-mono">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-[#f54e26] flex items-center justify-center text-white">
              <Sparkles className="w-3 h-3 fill-white" />
            </div>
            <span className="font-bold text-zinc-200 uppercase tracking-wider text-sm">RepoMind</span>
            <span className="text-zinc-600">•</span>
            <span>UNDERSTAND ANY CODEBASE</span>
          </div>

          <div className="flex items-center space-x-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161616] border border-[#262626] text-[11px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b]"></span>
              <span>ZERO DEPENDENCY HALLUCINATIONS</span>
            </div>
            <span className="text-zinc-600 hidden sm:inline">© 2026 REPOMIND</span>
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
