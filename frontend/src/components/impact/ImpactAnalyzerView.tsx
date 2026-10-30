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
  Cpu
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
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#090d16] text-slate-100 overflow-y-auto">
      {/* Top Banner & Search */}
      <div className="p-8 border-b border-white/10 bg-gradient-to-b from-[#0f172a] to-[#090d16] shrink-0">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Dependency Blast Radius & Impact Estimation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            What change are you planning to make?
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            RepoMind statically traverses your codebase dependency and call graph to compute the ripple effects, breaking risks, and affected files before you write code.
          </p>

          {/* Search Box */}
          <div className="relative pt-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="e.g. I want to change the authentication logic..."
              className="w-full p-4 pl-4 pr-32 rounded-2xl bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/50 shadow-2xl"
            />
            <button
              onClick={() => handleAnalyze()}
              disabled={!query.trim() || loading}
              className="absolute right-2 top-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition-all active:scale-95"
            >
              {loading ? "Analyzing..." : "Analyze Impact"}
            </button>
          </div>

          {/* Sample Prompts */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-[11px] text-slate-500 font-semibold mr-1">Try example:</span>
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(q);
                  handleAnalyze(q);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/5 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {loading && (
            <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
              <span className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></span>
              <span>Traversing dependency graph & calculating transitive blast radius...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {result && !loading && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Summary Card */}
              <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-rose-400">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    <span>AI Risk & Blast Radius Assessment</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold">
                    {result.total_affected_count} Potentially Impacted Files
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-100">
                  {result.ai_assessment.impact_summary}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-300 space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Breaking Risk Assessment
                  </div>
                  <div>{result.ai_assessment.breaking_risk_assessment}</div>
                </div>

                {/* Key Watchouts */}
                {result.ai_assessment.key_watchouts.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Key Watchouts
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {result.ai_assessment.key_watchouts.map((w, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
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
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      High Potential Impact ({result.tiers.high.length} Files)
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-500">Direct targets & immediate callers</span>
                </div>

                <div className="space-y-2">
                  {result.tiers.high.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#0f172a] border border-rose-500/30 shadow-md flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="font-mono text-xs font-semibold text-rose-300 flex items-center space-x-2">
                          <FileCode className="w-3.5 h-3.5 text-rose-400" />
                          <span>{f.file_path}</span>
                          {f.is_seed && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-sans uppercase font-bold">
                              Direct Seed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                          {f.reason}
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenCode(f.file_path)}
                        className="text-xs text-rose-400 hover:text-rose-300 shrink-0 ml-4 font-medium"
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
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        Medium Potential Impact ({result.tiers.medium.length} Files)
                      </h2>
                    </div>
                    <span className="text-[11px] text-slate-500">2nd degree transitive dependents</span>
                  </div>

                  <div className="space-y-2">
                    {result.tiers.medium.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#0f172a] border border-amber-500/20 shadow-md flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="font-mono text-xs font-semibold text-amber-300 flex items-center space-x-2">
                            <FileCode className="w-3.5 h-3.5 text-amber-400" />
                            <span>{f.file_path}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            {f.reason}
                          </div>
                        </div>
                        <button
                          onClick={() => onOpenCode(f.file_path)}
                          className="text-xs text-amber-400 hover:text-amber-300 shrink-0 ml-4 font-medium"
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
                      <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Low Potential Impact ({result.tiers.low.length} Files)
                      </h2>
                    </div>
                    <span className="text-[11px] text-slate-500">Test suites & peripheral configs</span>
                  </div>

                  <div className="space-y-2">
                    {result.tiers.low.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono text-xs text-slate-300">{f.file_path}</div>
                          <div className="text-[10px] text-slate-500">{f.reason}</div>
                        </div>
                        <button
                          onClick={() => onOpenCode(f.file_path)}
                          className="text-xs text-slate-400 hover:text-slate-200 shrink-0 ml-4"
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
                <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-3">
                  <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Recommended Testing Checklist</span>
                  </h3>
                  <div className="space-y-2">
                    {result.ai_assessment.recommended_tests.map((t, idx) => (
                      <div key={idx} className="flex items-center space-x-2.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-[11px] text-slate-500 leading-relaxed text-center">
                {result.disclaimer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
