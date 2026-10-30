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
  Cpu
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
    <div className="flex-1 overflow-y-auto p-8 bg-[#090d16] text-slate-100">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Platform Settings & Credentials</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage repository indexing configuration, security guardrails, and model integrations.
          </p>
        </div>

        {/* API Integrations Card */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
            <Key className="w-4 h-4 text-indigo-400" />
            <span>Active API Configurations</span>
          </div>

          <div className="space-y-3">
            {/* Gemini */}
            <div className="p-4 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
                  <span>Google Gemini API</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Model: <span className="font-mono text-slate-300">gemini-2.5-flash</span> (High speed, grounded RAG)
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            {/* GitHub */}
            <div className="p-4 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
                  <span>GitHub Personal Access Token</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Authenticated
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Rate limit: <span className="font-mono text-slate-300">5,000 requests/hr</span>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Repository Metadata & Storage */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
            <Database className="w-4 h-4 text-violet-400" />
            <span>Repository Index Cache</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div className="text-slate-500 text-[11px]">Indexed Files</div>
              <div className="text-base font-bold text-slate-200 font-mono mt-0.5">{repo.file_count}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div className="text-slate-500 text-[11px]">Extracted Symbols</div>
              <div className="text-base font-bold text-slate-200 font-mono mt-0.5">{repo.function_count + repo.class_count}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div className="text-slate-500 text-[11px]">Dependencies</div>
              <div className="text-base font-bold text-slate-200 font-mono mt-0.5">{repo.dependency_count}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div className="text-slate-500 text-[11px]">Database Engine</div>
              <div className="text-base font-bold text-slate-200 font-mono mt-0.5">SQLite + aiosqlite</div>
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? "Exporting..." : "Export Intelligence Report (JSON)"}</span>
            </button>
          </div>
        </div>

        {/* Security & Untrusted Code Guardrails */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Application Security Guardrails</span>
          </div>

          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>Zero arbitrary code execution — all analysis is static AST and vector embeddings.</li>
            <li>Path traversal prevention applied to all file lookups.</li>
            <li>Automatic exclusion of `.env`, private keys, and credential patterns.</li>
            <li>Prompt injection shields isolating untrusted repository strings from model system rules.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
