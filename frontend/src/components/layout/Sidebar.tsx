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
  Cpu,
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
      badge: null,
    },
    {
      label: "RepoMind AI",
      href: `/workspace/${repoId}/chat`,
      icon: MessageSquareCode,
      badge: "Grounded",
    },
    {
      label: "Architecture Explorer",
      href: `/workspace/${repoId}/architecture`,
      icon: Network,
      badge: "Constellation",
    },
    {
      label: "Execution Path",
      href: `/workspace/${repoId}/execution-path`,
      icon: GitFork,
      badge: null,
    },
    {
      label: "Codebase Time Machine",
      href: `/workspace/${repoId}/time-machine`,
      icon: History,
      badge: null,
    },
    {
      label: "Contribution Assistant",
      href: `/workspace/${repoId}/contribution`,
      icon: Compass,
      badge: null,
    },
    {
      label: "Impact Analyzer",
      href: `/workspace/${repoId}/impact`,
      icon: ShieldAlert,
      badge: null,
    },
    {
      label: "Settings",
      href: `/workspace/${repoId}/settings`,
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="hidden lg:flex w-64 border-r border-white/10 bg-[#191919]/90 flex-col justify-between shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 select-none">
      {/* Top Nav Items */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-[#E8E4D3] uppercase tracking-wider">
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
                  ? "   text-[#E8E4D3] border border-[#333333] shadow-sm"
                  : "text-[#E8E4D3] hover:text-[#E8E4D3] hover:bg-[#242424]"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${isActive ? "text-[#E8E4D3]" : "text-[#E8E4D3] group-hover:text-[#E8E4D3]"}`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#242424] text-[#E8E4D3] border border-[#333333] font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Repository Intelligence Stats Summary */}
      {repo && (
        <div className="p-3 m-3 rounded-xl bg-[#242424] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#E8E4D3]">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#E8E4D3]" />
              <span>Intelligence Status</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-400 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Online</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px]">
            <div>
              <div className="text-[#E8E4D3]">Indexed Files</div>
              <div className="text-[#E8E4D3] font-semibold">
                {repo.file_count}
              </div>
            </div>
            <div>
              <div className="text-[#E8E4D3]">Functions</div>
              <div className="text-[#E8E4D3] font-semibold">
                {repo.function_count}
              </div>
            </div>
            <div>
              <div className="text-[#E8E4D3]">Classes</div>
              <div className="text-[#E8E4D3] font-semibold">
                {repo.class_count}
              </div>
            </div>
            <div>
              <div className="text-[#E8E4D3]">Dependencies</div>
              <div className="text-[#E8E4D3] font-semibold">
                {repo.dependency_count}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
