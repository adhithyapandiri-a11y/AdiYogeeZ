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
  Cpu
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
      icon: Network,
      badge: "Constellation"
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
    <aside className="w-64 border-r border-white/10 bg-[#0c121e]/90 flex flex-col justify-between shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 select-none">
      {/* Top Nav Items */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Intelligence Modules
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600/20 to-violet-600/10 text-indigo-300 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Repository Intelligence Stats Summary */}
      {repo && (
        <div className="p-3 m-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Intelligence Status</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-400 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Online</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px]">
            <div>
              <div className="text-slate-500">Indexed Files</div>
              <div className="text-slate-200 font-semibold">{repo.file_count}</div>
            </div>
            <div>
              <div className="text-slate-500">Functions</div>
              <div className="text-slate-200 font-semibold">{repo.function_count}</div>
            </div>
            <div>
              <div className="text-slate-500">Classes</div>
              <div className="text-slate-200 font-semibold">{repo.class_count}</div>
            </div>
            <div>
              <div className="text-slate-500">Dependencies</div>
              <div className="text-slate-200 font-semibold">{repo.dependency_count}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
