"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  MessageSquareCode, 
  Network, 
  GitFork, 
  History, 
  Compass, 
  ShieldAlert, 
  Settings,
  Code2,
  FileCode2,
  Cpu,
  Orbit
} from "lucide-react";
import { Repository } from "@/lib/types";

interface SidebarProps {
  repoId: number;
  repo?: Repository;
}

export default function Sidebar({ repoId, repo }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Overview",
      href: `/workspace/${repoId}`,
      icon: LayoutDashboard,
      badge: null
    },
    {
      label: "RepoMind AI",
      href: `/workspace/${repoId}/chat`,
      icon: MessageSquareCode,
      badge: "Grounded"
    },
    {
      label: "Architecture Explorer",
      href: `/workspace/${repoId}/architecture`,
      icon: Orbit,
      badge: "Cosmos"
    },
    {
      label: "Execution Path",
      href: `/workspace/${repoId}/execution-path`,
      icon: GitFork,
      badge: null
    },
    {
      label: "Codebase Time Machine",
      href: `/workspace/${repoId}/time-machine`,
      icon: History,
      badge: null
    },
    {
      label: "Contribution Assistant",
      href: `/workspace/${repoId}/contribution`,
      icon: Compass,
      badge: null
    },
    {
      label: "Impact Analyzer",
      href: `/workspace/${repoId}/impact`,
      icon: ShieldAlert,
      badge: null
    },
    {
      label: "Settings",
      href: `/workspace/${repoId}/settings`,
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="hidden lg:flex w-64 border-r border-[#222222] bg-[#0d0d0d] flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* Top Navigation */}
      <div className="p-3.5 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-widest">
          // REPOSITORY SUITE
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all group ${
                isActive
                  ? "bg-[#f54e26]/10 text-[#f54e26] border-l-2 border-[#f54e26] font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-[#161616]"
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-[#f54e26]" : "text-zinc-500 group-hover:text-zinc-300"
                }`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider shrink-0 ${
                  isActive
                    ? "bg-[#f54e26] text-white"
                    : "bg-[#1c1c1c] text-zinc-400 border border-[#2a2a2a]"
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Repository Meta Card */}
      {repo && (
        <div className="p-3.5 border-t border-[#222222]">
          <div className="p-3.5 rounded-2xl bg-[#141414] border border-[#262626] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                AST INDEX
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#00a86b]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b]"></span>
                <span>SYNCED</span>
              </span>
            </div>

            <div className="truncate font-mono font-semibold text-xs text-white">
              {repo.owner}/{repo.name}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 text-zinc-400 border-t border-[#222222]">
              <div>
                <span className="text-zinc-600">FILES: </span>
                <span className="text-zinc-300 font-semibold">{repo.file_count}</span>
              </div>
              <div>
                <span className="text-zinc-600">FUNCS: </span>
                <span className="text-zinc-300 font-semibold">{repo.function_count}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
