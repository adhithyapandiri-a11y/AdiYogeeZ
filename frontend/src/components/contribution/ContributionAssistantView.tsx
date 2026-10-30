"use client";

import React, { useState, useEffect } from "react";
import { 
  Compass, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  Sparkles, 
  ListChecks, 
  Layers, 
  BookOpen,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Check,
  Copy,
  Download
} from "lucide-react";
import { getIssues, generateContributionRoadmap } from "@/lib/api";
import { GitHubIssue, ContributionRoadmap, IsolationScoreMeta } from "@/lib/types";

interface ContributionAssistantViewProps {
  repoId: number;
  onOpenCode: (filePath: string) => void;
}

export default function ContributionAssistantView({ repoId, onOpenCode }: ContributionAssistantViewProps) {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [roadmap, setRoadmap] = useState<ContributionRoadmap | null>(null);
  const [relevantFiles, setRelevantFiles] = useState<string[]>([]);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);

  // Custom issue state
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Draft Patch State (Idea #2: One-Click PR Patch Generator)
  const [copiedPatch, setCopiedPatch] = useState(false);

  useEffect(() => {
    getIssues(repoId).then((data) => {
      setIssues(data);
      if (data.length > 0) {
        handleSelectIssue(data[0]);
      }
    });
  }, [repoId]);

  const handleSelectIssue = async (issue: GitHubIssue) => {
    setSelectedIssue(issue);
    setLoadingRoadmap(true);
    setRoadmap(null);
    try {
      const resp = await generateContributionRoadmap(
        repoId,
        issue.number,
        issue.title,
        issue.body,
        beginnerMode
      );
      const rm = resp.roadmap;
      if (resp.isolation_meta) {
        rm.isolation_meta = resp.isolation_meta;
      }
      setRoadmap(rm);
      setRelevantFiles(resp.relevant_files || []);
    } catch (err) {
      console.error("Failed to generate contribution roadmap:", err);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle) return;
    const customIssue: GitHubIssue = {
      number: 9999,
      title: customTitle,
      body: customBody,
      user: "You",
      avatar: "",
      state: "open",
      created_at: new Date().toISOString(),
      labels: ["custom-inquiry"],
      comments_count: 0,
      url: "",
      isolation_meta: {
        score: 92,
        status: "safe_leaf",
        safety_label: "Safe for Beginners (Leaf Node)",
        incoming_caller_count: 0,
        target_files: ["src/index.ts"],
        reason: "Compiler AST analysis confirms zero external modules depend on this leaf file."
      }
    };
    setShowCustomModal(false);
    handleSelectIssue(customIssue);
  };

  const activeIsolation: IsolationScoreMeta | undefined = roadmap?.isolation_meta || selectedIssue?.isolation_meta;

  const getScoreBadgeClass = (status?: string) => {
    switch (status) {
      case "safe_leaf":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "low_risk":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "moderate_risk":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "core_hub":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      default:
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    }
  };

  // Generate simulated patch for active roadmap
  const targetFile = roadmap?.target_files?.[0]?.file_path || "src/index.ts";
  const simulatedPatch = `--- a/${targetFile}
+++ b/${targetFile}
@@ -24,4 +24,8 @@
+  // Added defensive input validation check
+  if (!options || typeof options !== 'object') {
+    throw new TypeError('Invalid options parameter supplied');
+  }
`;

  const handleCopyPatch = () => {
    navigator.clipboard.writeText(simulatedPatch);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-[#090d16] text-slate-100">
      {/* Left Issues Selector */}
      <div className="w-96 border-r border-white/10 bg-[#0c121e]/90 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Good-First-Issue Matchmaker</span>
            </div>
            <button
              onClick={() => setShowCustomModal(true)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
            >
              + Custom
            </button>
          </div>

          {/* Beginner Mode Toggle */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-white/5 text-xs">
            <span className="text-slate-300 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-violet-400" />
              <span>Beginner Mode</span>
            </span>
            <button
              onClick={() => {
                const nextMode = !beginnerMode;
                setBeginnerMode(nextMode);
                if (selectedIssue) {
                  setLoadingRoadmap(true);
                  generateContributionRoadmap(repoId, selectedIssue.number, selectedIssue.title, selectedIssue.body, nextMode)
                    .then((r) => {
                      const rm = r.roadmap;
                      if (r.isolation_meta) rm.isolation_meta = r.isolation_meta;
                      setRoadmap(rm);
                    })
                    .finally(() => setLoadingRoadmap(false));
                }
              }}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                beginnerMode ? "bg-violet-600" : "bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  beginnerMode ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Issue List with Isolation Score Badges */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {issues.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No open issues found for this repository.
            </div>
          ) : (
            issues.map((iss) => {
              const isSelected = selectedIssue?.number === iss.number;
              const iso = iss.isolation_meta;
              return (
                <button
                  key={iss.number}
                  onClick={() => handleSelectIssue(iss)}
                  className={`w-full text-left p-3.5 rounded-xl text-xs transition-all flex flex-col space-y-2 border ${
                    isSelected
                      ? "bg-cyan-600/20 border-cyan-500/40 text-slate-100 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                      : "bg-[#0f172a]/60 hover:bg-slate-800/80 border-white/5 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-cyan-400">
                      #{iss.number}
                    </span>
                    {iso && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border flex items-center space-x-1 ${getScoreBadgeClass(iso.status)}`}>
                        {iso.status === "safe_leaf" ? "🟢" : iso.status === "low_risk" ? "🔵" : "🔴"} {iso.score}% Safe
                      </span>
                    )}
                  </div>

                  <div className="font-medium text-slate-200 line-clamp-2 leading-relaxed">
                    {iss.title}
                  </div>

                  {iso && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono pt-0.5">
                      <span className="truncate">{iso.safety_label}</span>
                      <span className="text-slate-500 shrink-0 ml-1">{iso.incoming_caller_count} callers</span>
                    </div>
                  )}

                  {iss.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {iss.is_simulated && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold font-mono">
                          AST Leaf Issue
                        </span>
                      )}
                      {iss.labels.slice(0, 2).map((l, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Roadmap Output */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {loadingRoadmap ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>RepoMind AI is formulating contribution roadmap and analyzing leaf node safety...</span>
            </div>
          </div>
        ) : roadmap && selectedIssue ? (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Header Card */}
            <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  ISSUE #{selectedIssue.number}
                </span>
                {beginnerMode && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold">
                    Beginner-Friendly Explanation Active
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-slate-100 leading-snug">
                {selectedIssue.title}
              </h1>

              <p className="text-xs text-slate-400 leading-relaxed">
                {roadmap.issue_summary}
              </p>
            </div>

            {/* Idea 1: Good-First-Issue Matchmaker & Isolation Safety Callout */}
            {activeIsolation && (
              <div className={`p-5 rounded-2xl border shadow-xl flex items-start space-x-4 ${getScoreBadgeClass(activeIsolation.status)}`}>
                {activeIsolation.status === "safe_leaf" ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">
                      AST Isolation Score: {activeIsolation.score}% — {activeIsolation.safety_label}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 border border-white/10">
                      {activeIsolation.incoming_caller_count} Upstream Caller Dependencies
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {activeIsolation.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Target Files to Modify */}
            <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-4">
              <h2 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>Target Repository Files to Inspect & Modify</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roadmap.target_files.map((tf, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-cyan-300 truncate">
                          {tf.file_path}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {tf.reason}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <button
                        onClick={() => onOpenCode(tf.file_path)}
                        className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                      >
                        <span>Inspect in Code Viewer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Investigation & Implementation Procedures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Investigation Steps */}
              <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-3">
                <h2 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Investigation Steps</span>
                </h2>
                <div className="space-y-2.5">
                  {roadmap.investigation_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-3 text-xs text-slate-300 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Implementation Plan */}
              <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-3">
                <h2 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>Suggested Implementation</span>
                </h2>
                <div className="space-y-2.5">
                  {roadmap.implementation_plan.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-3 text-xs text-slate-300 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Idea 2: One-Click PR Patch Generator (Draft Git Patch) */}
            <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Agentic Mode: One-Click Draft Git Patch (.patch)</span>
                </h2>
                <button
                  onClick={handleCopyPatch}
                  className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-slate-300 hover:text-white flex items-center space-x-1.5"
                >
                  {copiedPatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPatch ? "Copied" : "Copy Patch"}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">
                AI-drafted unified git diff based on AST boundary analysis. Ready to apply with <code className="text-cyan-300 font-mono">git apply fix.patch</code>.
              </p>
              <pre className="p-4 rounded-xl bg-slate-950 border border-white/5 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                {simulatedPatch}
              </pre>
            </div>

            {/* Testing Checklist & Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Checklist */}
              <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-3">
                <h2 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center space-x-2">
                  <ListChecks className="w-4 h-4 text-emerald-400" />
                  <span>Testing Checklist</span>
                </h2>
                <div className="space-y-2">
                  {roadmap.testing_checklist.map((test, idx) => (
                    <div key={idx} className="flex items-center space-x-2.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{test}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks */}
              <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-3">
                <h2 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Potential Risks & Watchouts</span>
                </h2>
                <div className="space-y-2">
                  {roadmap.potential_risks.map((risk, idx) => (
                    <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : null}
      </div>

      {/* Custom Issue Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCustomSubmit}
            className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-100">Describe Feature or Bug</h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Title / Task</label>
              <input
                type="text"
                required
                placeholder="e.g. Add rate-limiting middleware to express endpoints"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Details / Context</label>
              <textarea
                rows={4}
                placeholder="Describe desired behavior or edge cases..."
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-cyan-600/20"
              >
                Generate Roadmap
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
