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
  Activity,
  ArrowUpRight
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
    <header className="h-16 border-b border-[#242424] bg-[#0d0d0d]/95 backdrop-blur-xl sticky top-0 z-40 px-5 sm:px-7 flex items-center justify-between select-none">
      {/* Brand & Repo Selector */}
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#f54e26] flex items-center justify-center text-white shadow-[0_0_15px_rgba(245,78,38,0.4)] group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white uppercase font-mono">
            RepoMind
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1c1c1c] text-[#f54e26] border border-[#2e2e2e]">
            v1.0
          </span>
        </Link>

        {/* Repository Switcher */}
        {currentRepo && (
          <div className="relative hidden sm:block">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-[#161616] border border-[#2a2a2a] hover:border-zinc-500 text-xs font-mono text-zinc-200 transition-all cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#f54e26]" />
              <span className="max-w-[200px] truncate text-white font-semibold">
                {currentRepo.owner}/{currentRepo.name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#202020] text-zinc-400 border border-[#2e2e2e]">
                {currentRepo.primary_language || "Code"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div 
                className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-[#141414] border border-[#2a2a2a] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="text-[10px] font-mono text-zinc-500 px-3 py-1.5 uppercase tracking-wider">
                  Indexed Codebases
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 my-1">
                  {repos.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setDropdownOpen(false);
                        if (onSelectRepo) onSelectRepo(r);
                        router.push(`/workspace/${r.id}`);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        r.id === currentRepo.id
                          ? "bg-[#f54e26]/10 text-white border border-[#f54e26]/40"
                          : "hover:bg-[#1e1e1e] text-zinc-300"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-mono font-medium text-white truncate">{r.owner}/{r.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{r.file_count} files • {r.primary_language}</div>
                      </div>
                      {r.id === currentRepo.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#f54e26] shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#222222] mt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      if (onOpenConnectModal) onOpenConnectModal();
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] text-[#f54e26] font-mono text-xs font-semibold transition-colors"
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

      {/* Right Controls */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* System Active Pill */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-[#161616] border border-[#262626] text-[11px] font-mono text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse"></span>
          <span>INDEX ACTIVE</span>
        </div>

        {currentRepo && (
          <a
            href={currentRepo.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#181818] border border-[#2b2b2b] hover:border-zinc-500 text-xs font-mono text-zinc-300 transition-colors"
          >
            <span>GitHub</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-500" />
          </a>
        )}

        <button
          onClick={onOpenConnectModal}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#f54e26] hover:bg-[#ff623d] text-white font-semibold text-xs tracking-wide shadow-[0_0_15px_rgba(245,78,38,0.3)] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Connect Repo</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </header>
  );
}
