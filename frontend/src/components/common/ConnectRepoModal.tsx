"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  X, 
  GitBranch, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  Terminal,
  ShieldCheck
} from "lucide-react";
import { connectRepo, getRepository } from "@/lib/api";
import { Repository } from "@/lib/types";

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (repoId: number) => void;
}

export default function ConnectRepoModal({ isOpen, onClose, onSuccess }: ConnectRepoModalProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Indexing state
  const [indexingRepoId, setIndexingRepoId] = useState<number | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<Repository | null>(null);

  // Example public repos
  const sampleRepos = [
    { name: "expressjs/express", desc: "Fast, unopinionated Node.js web framework" },
    { name: "tiangolo/fastapi", desc: "FastAPI framework, high performance Python" },
    { name: "pallets/flask", desc: "The Python micro framework for building web apps" },
    { name: "facebook/react", desc: "The library for web and native user interfaces" }
  ];

  const handleSubmit = async (targetUrl?: string) => {
    const finalUrl = targetUrl || url;
    if (!finalUrl.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const resp = await connectRepo(finalUrl.trim());
      if (resp.status === "already_indexed") {
        if (onSuccess) onSuccess(resp.repo_id);
        router.push(`/workspace/${resp.repo_id}`);
        onClose();
        return;
      }

      setIndexingRepoId(resp.repo_id);
    } catch (err: any) {
      setError(err.message || "Failed to connect to GitHub repository.");
      setIsSubmitting(false);
    }
  };

  // Poll indexing status while indexing
  useEffect(() => {
    if (!indexingRepoId) return;

    const interval = setInterval(async () => {
      try {
        const repo = await getRepository(indexingRepoId);
        setIndexingStatus(repo);

        if (repo.indexing_status === "completed") {
          clearInterval(interval);
          setTimeout(() => {
            if (onSuccess) onSuccess(indexingRepoId);
            router.push(`/workspace/${indexingRepoId}`);
            onClose();
          }, 800);
        } else if (repo.indexing_status === "failed") {
          clearInterval(interval);
          setError(repo.status_message || "Indexing pipeline failed.");
          setIsSubmitting(false);
          setIndexingRepoId(null);
        }
      } catch (err) {
        console.error("Status poll error:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [indexingRepoId, router, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[#0c121e] border border-white/10 rounded-3xl shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!indexingRepoId && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {!indexingRepoId ? (
          /* Input Form */
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <GitBranch className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Connect a GitHub Repository</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter any public GitHub repository URL to index its architecture, functions, AST relationships, and vector embeddings.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  GitHub Repository URL or owner/repo
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/expressjs/express or pallets/flask"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-3.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={!url.trim() || isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:opacity-95 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating Repository...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Start Repository Intelligence Indexing</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Repositories */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Or explore popular open-source projects:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sampleRepos.map((sr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUrl(`https://github.com/${sr.name}`);
                      handleSubmit(`https://github.com/${sr.name}`);
                    }}
                    className="text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-indigo-500/30 text-xs transition-colors group"
                  >
                    <div className="font-mono text-indigo-300 font-semibold truncate group-hover:text-indigo-200">
                      {sr.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {sr.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Live Progress Screen (Section 6 Requirements) */
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">
                Building Repository Intelligence
              </h3>
              <p className="text-xs text-slate-400">
                Executing 8-stage AST & vector analysis pipeline...
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300 font-mono">
                  {indexingStatus?.status_message || "Processing..."}
                </span>
                <span className="text-indigo-400 font-mono">
                  {indexingStatus?.progress_percent || 15}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 border border-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-500 rounded-full"
                  style={{ width: `${indexingStatus?.progress_percent || 15}%` }}
                />
              </div>
            </div>

            {/* Stages indicator list */}
            <div className="space-y-2 pt-2 text-xs">
              {[
                { stage: 1, name: "Connecting to GitHub & validating repository" },
                { stage: 2, name: "Retrieving file tree and directory hierarchy" },
                { stage: 3, name: "Identifying languages & filtering source assets" },
                { stage: 4, name: "Parsing source code with Tree-sitter & AST" },
                { stage: 5, name: "Extracting functions, classes, and methods" },
                { stage: 6, name: "Building dependency relationships & call graph" },
                { stage: 7, name: "Generating vector embeddings with Gemini" },
                { stage: 8, name: "Preparing repository intelligence database" }
              ].map((s) => {
                const currentPct = indexingStatus?.progress_percent || 15;
                const isPassed = currentPct >= s.stage * 12;
                const isCurrent = currentPct < s.stage * 12 && currentPct >= (s.stage - 1) * 12;

                return (
                  <div
                    key={s.stage}
                    className={`flex items-center space-x-2.5 ${
                      isPassed ? "text-emerald-400" : isCurrent ? "text-indigo-300" : "text-slate-600"
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center shrink-0 text-[9px] font-mono">
                        {s.stage}
                      </div>
                    )}
                    <span className="text-[11px] truncate font-medium">{s.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
