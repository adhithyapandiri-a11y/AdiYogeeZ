"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  Search, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  FileCode, 
  Sparkles, 
  Layers,
  HelpCircle,
  TrendingUp,
  Cpu,
  ArrowUpRight
} from "lucide-react";
import { analyzeImpact } from "@/lib/api";
import { ImpactAnalysisResponse } from "@/lib/types";

interface ImpactAnalyzerViewProps {
  repoId: number;
  onOpenCode: (filePath: string) => void;
}

export default function ImpactAnalyzerView({ repoId, onOpenCode }: ImpactAnalyzerViewProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImpactAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleQueries = [
    "I want to refactor authentication and token verification",
    "Change database query connection pool logic",
    "Modify payment gateway webhook response handling",
    "Update user profile schema and serializer"
  ];

  const handleAnalyze = async (proposedText?: string) => {
    const text = proposedText || query;
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await analyzeImpact(repoId, text);
      setResult(resp);
    } catch (err: any) {
      setError(err.message || "Failed to analyze impact blast radius.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0d0d0d] text-zinc-100 overflow-y-auto vsk-grid-bg-subtle select-none">
      {/* Top Banner & Search */}
      <div className="p-8 border-b border-[#222222] bg-[#121212] shrink-0">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center space-x-2 text-[#f54e26] text-xs font-mono font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-[#f54e26]" />
            <span>Dependency Blast Radius & Impact Estimation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono uppercase tracking-tight text-white">
            What change are you planning to make?
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl font-sans">
            RepoMind statically traverses your codebase dependency and call graph to calculate ripple effects, breaking risks, and affected files before you touch source files.
          </p>

          {/* Search Box */}
          <div className="relative pt-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="e.g. I want to change the authentication logic..."
              className="w-full p-4 pl-4 pr-36 rounded-2xl bg-[#181818] border border-[#2a2a2a] text-xs font-sans text-white placeholder-zinc-500 focus:outline-none focus:border-[#f54e26] shadow-xl"
            />
            <button
              onClick={() => handleAnalyze()}
              disabled={!query.trim() || loading}
              className="absolute right-2 top-4 px-5 py-2.5 rounded-full bg-[#f54e26] hover:bg-[#ff623d] disabled:opacity-40 text-white font-mono font-semibold text-xs shadow-md shadow-[#f54e26]/30 transition-all cursor-pointer"
            >
              {loading ? "Analyzing..." : "Analyze Impact"}
            </button>
          </div>

          {/* Sample Prompts */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mr-1">Try example:</span>
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(q);
                  handleAnalyze(q);
                }}
                className="text-[11px] px-3 py-1 rounded-full bg-[#181818] hover:bg-[#202020] text-zinc-300 border border-[#282828] hover:border-[#f54e26]/40 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {loading && (
            <div className="h-64 flex flex-col items-center justify-center space-y-3 text-zinc-400 text-xs font-mono">
              <span className="w-8 h-8 rounded-full border-2 border-[#f54e26] border-t-transparent animate-spin"></span>
              <span>Traversing dependency graph & calculating transitive blast radius...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-[#1c1212] border border-[#f54e26]/30 text-[#ff623d] text-xs font-mono">
              {error}
            </div>
          )}

          {result && !loading && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Summary Card */}
              <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                  <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-[#f54e26] uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#f54e26]" />
                    <span>AI Risk & Blast Radius Assessment</span>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#1c1c1c] text-[#f54e26] border border-[#2e2e2e]">
                    {result.total_affected_count} Potentially Impacted Files
                  </span>
                </div>

                <div className="text-sm font-bold text-white font-sans">
                  {result.ai_assessment.impact_summary}
                </div>

                <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] text-xs text-zinc-300 space-y-1 font-sans">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
                    Breaking Risk Assessment
                  </div>
                  <div>{result.ai_assessment.breaking_risk_assessment}</div>
                </div>

                {/* Key Watchouts */}
                {result.ai_assessment.key_watchouts.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
                      Key Watchouts
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {result.ai_assessment.key_watchouts.map((w, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs text-zinc-300 font-sans">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#f9bf28] shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* HIGH IMPACT CATEGORY */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f54e26] animate-pulse"></span>
                    <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#f54e26]">
                      High Potential Impact ({result.tiers.high.length} Files)
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">Direct targets & immediate callers</span>
                </div>

                <div className="space-y-2.5">
                  {result.tiers.high.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#141414] border border-[#f54e26]/30 shadow-md flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="font-mono text-xs font-semibold text-white flex items-center space-x-2">
                          <FileCode className="w-3.5 h-3.5 text-[#f54e26]" />
                          <span>{f.file_path}</span>
                          {f.is_seed && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#f54e26]/10 text-[#f54e26] font-mono uppercase font-bold border border-[#f54e26]/30">
                              Direct Seed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                          {f.reason}
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenCode(f.file_path)}
                        className="text-xs font-mono text-[#f54e26] hover:text-[#ff623d] shrink-0 ml-4 font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* MEDIUM IMPACT CATEGORY */}
              {result.tiers.medium.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f9bf28]"></span>
                      <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#f9bf28]">
                        Medium Potential Impact ({result.tiers.medium.length} Files)
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">2nd degree transitive dependents</span>
                  </div>

                  <div className="space-y-2.5">
                    {result.tiers.medium.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#141414] border border-[#f9bf28]/20 shadow-md flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="font-mono text-xs font-semibold text-white flex items-center space-x-2">
                            <FileCode className="w-3.5 h-3.5 text-[#f9bf28]" />
                            <span>{f.file_path}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                            {f.reason}
                          </div>
                        </div>
                        <button
                          onClick={() => onOpenCode(f.file_path)}
                          className="text-xs font-mono text-[#f9bf28] hover:text-[#fabf29] shrink-0 ml-4 font-semibold cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LOW IMPACT CATEGORY */}
              {result.tiers.low.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00a86b]"></span>
                      <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#00a86b]">
                        Low Potential Impact ({result.tiers.low.length} Files)
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">Test suites & peripheral configs</span>
                  </div>

                  <div className="space-y-2.5">
                    {result.tiers.low.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[#141414] border border-[#242424] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono text-xs text-zinc-200">{f.file_path}</div>
                          <div className="text-[10px] text-zinc-500 font-sans">{f.reason}</div>
                        </div>
                        <button
                          onClick={() => onOpenCode(f.file_path)}
                          className="text-xs font-mono text-zinc-400 hover:text-white shrink-0 ml-4 cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Testing Checklist */}
              {result.ai_assessment.recommended_tests.length > 0 && (
                <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-3.5">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00a86b]" />
                    <span>Recommended Testing Checklist</span>
                  </h3>
                  <div className="space-y-2.5">
                    {result.ai_assessment.recommended_tests.map((t, idx) => (
                      <div key={idx} className="flex items-center space-x-2.5 text-xs text-zinc-300 font-sans">
                        <CheckCircle2 className="w-4 h-4 text-[#00a86b] shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-4 rounded-2xl bg-[#121212] border border-[#222222] text-[11px] font-mono text-zinc-500 leading-relaxed text-center">
                {result.disclaimer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
