"use client";

import React, { useState } from "react";
import { 
  Settings, 
  CheckCircle2, 
  Key, 
  Database, 
  Download, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Cpu,
  ArrowUpRight
} from "lucide-react";
import { Repository } from "@/lib/types";

interface SettingsViewProps {
  repo: Repository;
}

export default function SettingsView({ repo }: SettingsViewProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(repo, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `repomind-${repo.name}-analysis.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => setExporting(false), 1000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0d0d0d] text-zinc-100 vsk-grid-bg-subtle select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#f54e26]">
            // SYSTEM CONFIGURATION
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-mono uppercase tracking-tight text-white mt-1">
            Platform Settings & Credentials
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Manage repository indexing configuration, security guardrails, and model integrations.
          </p>
        </div>

        {/* API Integrations Card */}
        <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-white uppercase tracking-wider">
            <Key className="w-4 h-4 text-[#f54e26]" />
            <span>Active API Configurations</span>
          </div>

          <div className="space-y-3 font-mono">
            {/* Gemini */}
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center space-x-2">
                  <span>Google Gemini API</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00a86b]/10 text-[#00a86b] border border-[#00a86b]/20">
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-sans">
                  Model: <span className="font-mono text-[#f54e26]">gemini-2.5-flash</span> (High speed, grounded AST RAG)
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[#00a86b]" />
            </div>

            {/* GitHub */}
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center space-x-2">
                  <span>GitHub Repository Integrations</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00a86b]/10 text-[#00a86b] border border-[#00a86b]/20">
                    Ready
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-sans">
                  Public repository rate limit: <span className="font-mono text-zinc-200">5,000 requests/hr</span>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[#00a86b]" />
            </div>
          </div>
        </div>

        {/* Repository Metadata & Storage */}
        <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-white uppercase tracking-wider">
            <Database className="w-4 h-4 text-[#f54e26]" />
            <span>Repository Index Cache</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828]">
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Indexed Files</div>
              <div className="text-xl font-black text-white mt-1">{repo.file_count}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828]">
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider">AST Symbols</div>
              <div className="text-xl font-black text-white mt-1">{repo.function_count + repo.class_count}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828]">
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Dependencies</div>
              <div className="text-xl font-black text-white mt-1">{repo.dependency_count}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828]">
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Database</div>
              <div className="text-xs font-bold text-[#f54e26] mt-2 truncate">SQLite + aiosqlite</div>
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#1c1c1c] hover:bg-[#252525] text-zinc-200 hover:text-white text-xs font-mono font-semibold border border-[#2e2e2e] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#f54e26]" />
              <span>{exporting ? "Exporting..." : "Export Intelligence Report (JSON)"}</span>
            </button>
          </div>
        </div>

        {/* Security & Untrusted Code Guardrails */}
        <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-3 font-mono">
          <div className="flex items-center space-x-2 text-xs font-semibold text-white uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#00a86b]" />
            <span>Application Security Guardrails</span>
          </div>

          <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside leading-relaxed font-sans">
            <li>Zero arbitrary code execution — all analysis is static Tree-sitter AST and vector embeddings.</li>
            <li>Path traversal prevention applied to all file lookups.</li>
            <li>Automatic exclusion of `.env`, private keys, and credential patterns.</li>
            <li>Prompt injection shields isolating untrusted repository strings from model system rules.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
