"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  GitBranch, 
  Layers, 
  Sparkles, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  ChevronDown,
  Terminal,
  Activity
} from "lucide-react";
import { Repository } from "@/lib/types";
import { getRepositories } from "@/lib/api";

interface NavbarProps {
  currentRepo?: Repository;
  onSelectRepo?: (repo: Repository) => void;
  onOpenConnectModal?: () => void;
}

export default function Navbar({ currentRepo, onSelectRepo, onOpenConnectModal }: NavbarProps) {
  const router = useRouter();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    getRepositories()
      .then(setRepos)
      .catch((err) => console.error("Error fetching repos:", err));
  }, []);

  return (
    <header className="h-14 border-b border-white/10 bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
            RepoMind
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            v1.0
          </span>
        </Link>

        {/* Repository Switcher */}
        {currentRepo && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 hover:border-white/20 text-sm font-medium text-slate-200 transition-all hover:bg-slate-800/80"
            >
              <GitBranch className="w-4 h-4 text-violet-400" />
              <span className="max-w-[200px] truncate text-slate-100 font-semibold">
                {currentRepo.owner}/{currentRepo.name}
              </span>
              <span className="text-xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-white/5">
                {currentRepo.primary_language || "Code"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div 
                className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Indexed Repositories
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 my-1">
                  {repos.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setDropdownOpen(false);
                        if (onSelectRepo) onSelectRepo(r);
                        router.push(`/workspace/${r.id}`);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        r.id === currentRepo.id
                          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                          : "hover:bg-slate-800/80 text-slate-300"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium text-slate-200 truncate">{r.owner}/{r.name}</div>
                        <div className="text-[10px] text-slate-400">{r.file_count} files • {r.primary_language}</div>
                      </div>
                      {r.id === currentRepo.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      if (onOpenConnectModal) onOpenConnectModal();
                      else router.push("/");
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect New Repository</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side stats & actions */}
      <div className="flex items-center space-x-3">
        {/* Status Indicators */}
        <div className="hidden md:flex items-center space-x-3 px-3 py-1 rounded-full bg-slate-900/60 border border-white/5 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Gemini 2.5 Flash</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span className="text-slate-300 font-medium">GitHub API Active</span>
          </div>
        </div>

        <button
          onClick={() => {
            if (onOpenConnectModal) onOpenConnectModal();
            else router.push("/");
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Repo</span>
        </button>
      </div>
    </header>
  );
}
