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
  ShieldCheck,
  ArrowUpRight
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
    { name: "vasturiano/react-force-graph", desc: "Force-directed 2D/3D graphs component" },
    { name: "pallets/flask", desc: "The Python micro framework for web apps" },
    { name: "facebook/react", desc: "The library for web and native UIs" }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[#141414] border border-[#2a2a2a] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-7 relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!indexingRepoId && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-[#202020] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {!indexingRepoId ? (
          /* Input Form */
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#1e1e1e] border border-[#2e2e2e] flex items-center justify-center text-[#f54e26]">
                <GitBranch className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold font-mono uppercase tracking-tight text-white">
                Connect a GitHub Repository
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Enter any public GitHub repository to parse its AST architecture, function call relationships, and build a vector knowledge base.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-[#1c1212] border border-[#f54e26]/30 text-[#ff623d] text-xs flex items-start space-x-2.5 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#f54e26]" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">
                  // REPOSITORY URL OR OWNER/NAME
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/expressjs/express or pallets/flask"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-3.5 rounded-2xl bg-[#181818] border border-[#2c2c2c] text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#f54e26] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={!url.trim() || isSubmitting}
                className="w-full py-3.5 px-5 rounded-full bg-[#f54e26] hover:bg-[#ff623d] disabled:opacity-40 text-white font-semibold text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(245,78,38,0.35)] transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating Repository...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-white" />
                    <span>Launch AST Parsing Engine</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Repositories */}
            <div className="pt-3 border-t border-[#222222] space-y-2.5">
              <div className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
                Or explore indexed community repositories:
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {sampleRepos.map((sr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUrl(`https://github.com/${sr.name}`);
                      handleSubmit(`https://github.com/${sr.name}`);
                    }}
                    className="text-left p-3 rounded-2xl bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#f54e26]/50 text-xs transition-colors group cursor-pointer"
                  >
                    <div className="font-mono text-zinc-200 font-semibold truncate group-hover:text-[#f54e26] flex items-center justify-between">
                      <span className="truncate">{sr.name}</span>
                      <ArrowUpRight className="w-3 h-3 text-zinc-600 group-hover:text-[#f54e26] shrink-0" />
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5 font-sans">
                      {sr.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Live Progress Screen */
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#1c1c1c] border border-[#2e2e2e] flex items-center justify-center text-[#f54e26] shadow-[0_0_20px_rgba(245,78,38,0.3)]">
                <Loader2 className="w-6 h-6 animate-spin text-[#f54e26]" />
              </div>
              <h3 className="text-lg font-bold font-mono uppercase tracking-tight text-white">
                Building Repository Intelligence
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Executing 8-stage AST extraction & vector analysis pipeline...
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300">
                  {indexingStatus?.status_message || "Processing..."}
                </span>
                <span className="text-[#f54e26] font-bold">
                  {indexingStatus?.progress_percent || 15}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] overflow-hidden">
                <div
                  className="h-full bg-[#f54e26] transition-all duration-500 rounded-full"
                  style={{ width: `${indexingStatus?.progress_percent || 15}%` }}
                />
              </div>
            </div>

            {/* Stages indicator list */}
            <div className="space-y-2 pt-2 text-xs font-mono">
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
                      isPassed ? "text-[#00a86b]" : isCurrent ? "text-[#f54e26]" : "text-zinc-600"
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00a86b] shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-[#f54e26] animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center shrink-0 text-[9px]">
                        {s.stage}
                      </div>
                    )}
                    <span className="text-[11px] truncate font-sans font-medium">{s.name}</span>
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
