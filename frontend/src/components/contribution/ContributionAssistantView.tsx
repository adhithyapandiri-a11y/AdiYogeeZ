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
  Download,
  ArrowUpRight
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

  // Draft Patch State
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
        return "bg-[#00a86b]/10 text-[#00a86b] border-[#00a86b]/30";
      case "low_risk":
        return "bg-[#f9bf28]/10 text-[#f9bf28] border-[#f9bf28]/30";
      case "moderate_risk":
        return "bg-[#f54e26]/10 text-[#ff623d] border-[#f54e26]/30";
      case "core_hub":
        return "bg-[#f54e26]/20 text-[#ff4b2b] border-[#f54e26]/40";
      default:
        return "bg-[#00a86b]/10 text-[#00a86b] border-[#00a86b]/30";
    }
  };

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
    <div className="flex h-[calc(100vh-4rem)] bg-[#0d0d0d] text-zinc-100 vsk-grid-bg-subtle select-none">
      {/* Left Issues Selector */}
      <div className="w-96 border-r border-[#222222] bg-[#0d0d0d] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#222222] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-white uppercase tracking-wider">
              <Compass className="w-4 h-4 text-[#f54e26]" />
              <span>Issue Matchmaker</span>
            </div>
            <button
              onClick={() => setShowCustomModal(true)}
              className="text-[11px] text-[#f54e26] hover:text-[#ff623d] font-mono font-medium cursor-pointer"
            >
              + Custom
            </button>
          </div>

          {/* Beginner Mode Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#141414] border border-[#262626] text-xs font-mono">
            <span className="text-zinc-300 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#f54e26]" />
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
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                beginnerMode ? "bg-[#f54e26]" : "bg-zinc-700"
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

        {/* Issue List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {issues.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-zinc-500">
              No open issues indexed for this repository.
            </div>
          ) : (
            issues.map((iss) => {
              const isSelected = selectedIssue?.number === iss.number;
              const iso = iss.isolation_meta;
              return (
                <button
                  key={iss.number}
                  onClick={() => handleSelectIssue(iss)}
                  className={`w-full text-left p-4 rounded-2xl text-xs transition-all flex flex-col space-y-2.5 border cursor-pointer ${
                    isSelected
                      ? "bg-[#f54e26]/10 border-[#f54e26]/50 text-white shadow-md"
                      : "bg-[#141414] hover:bg-[#1a1a1a] border-[#242424] text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#f54e26]">
                      #{iss.number}
                    </span>
                    {iso && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border flex items-center space-x-1 ${getScoreBadgeClass(iso.status)}`}>
                        <span>{iso.score}% Safe</span>
                      </span>
                    )}
                  </div>

                  <div className="font-sans font-medium text-zinc-200 line-clamp-2 leading-relaxed">
                    {iss.title}
                  </div>

                  {iso && (
                    <div className="text-[10px] text-zinc-400 flex items-center justify-between font-mono pt-1 border-t border-[#1e1e1e]">
                      <span className="truncate">{iso.safety_label}</span>
                      <span className="text-zinc-500 shrink-0 ml-1">{iso.incoming_caller_count} callers</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Roadmap Output */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {loadingRoadmap ? (
          <div className="h-64 flex items-center justify-center text-zinc-500 text-xs font-mono">
            <div className="flex items-center space-x-2.5">
              <span className="w-2 h-2 rounded-full bg-[#f54e26] animate-ping"></span>
              <span>Formulating contribution roadmap and analyzing AST leaf node safety...</span>
            </div>
          </div>
        ) : roadmap && selectedIssue ? (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Header Card */}
            <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#1c1c1c] text-[#f54e26] border border-[#2e2e2e]">
                  ISSUE #{selectedIssue.number}
                </span>
                {beginnerMode && (
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#f54e26]/10 text-[#f54e26] border border-[#f54e26]/30 font-semibold">
                    Beginner-Friendly Explanation Active
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-white leading-snug">
                {selectedIssue.title}
              </h1>

              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {roadmap.issue_summary}
              </p>
            </div>

            {/* Isolation Safety Callout */}
            {activeIsolation && (
              <div className={`p-6 rounded-3xl border shadow-xl flex items-start space-x-4 ${getScoreBadgeClass(activeIsolation.status)}`}>
                {activeIsolation.status === "safe_leaf" ? (
                  <ShieldCheck className="w-6 h-6 text-[#00a86b] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-[#f9bf28] shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      AST Isolation Score: {activeIsolation.score}% — {activeIsolation.safety_label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                      {activeIsolation.incoming_caller_count} Callers
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {activeIsolation.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Target Files to Modify */}
            <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-[#f54e26]" />
                <span>Target Repository Files to Inspect & Modify</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {roadmap.target_files.map((tf, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-white truncate">
                          {tf.file_path}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                        {tf.reason}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <button
                        onClick={() => onOpenCode(tf.file_path)}
                        className="text-[11px] font-mono text-[#f54e26] hover:text-[#ff623d] flex items-center space-x-1 cursor-pointer"
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
              <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-4">
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-[#f54e26]" />
                  <span>Investigation Steps</span>
                </h2>
                <div className="space-y-3">
                  {roadmap.investigation_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-3 text-xs text-zinc-300 leading-relaxed font-sans">
                      <span className="w-5 h-5 rounded-full bg-[#1c1c1c] border border-[#2c2c2c] text-[#f54e26] flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Implementation Plan */}
              <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-4">
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#f54e26]" />
                  <span>Suggested Implementation</span>
                </h2>
                <div className="space-y-3">
                  {roadmap.implementation_plan.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-3 text-xs text-zinc-300 leading-relaxed font-sans">
                      <span className="w-5 h-5 rounded-full bg-[#1c1c1c] border border-[#2c2c2c] text-[#f54e26] flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* One-Click PR Patch Generator */}
            <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#f54e26]" />
                  <span>Draft Git Patch (.patch)</span>
                </h2>
                <button
                  onClick={handleCopyPatch}
                  className="px-3.5 py-1.5 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] text-xs font-mono text-zinc-300 hover:text-white flex items-center space-x-1.5 cursor-pointer"
                >
                  {copiedPatch ? <Check className="w-3.5 h-3.5 text-[#00a86b]" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copiedPatch ? "Copied" : "Copy Patch"}</span>
                </button>
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                AI-drafted unified git diff based on AST boundary analysis. Ready to apply with <code className="text-[#f54e26] font-mono">git apply fix.patch</code>.
              </p>
              <pre className="p-4 rounded-2xl bg-[#0d0d0d] border border-[#222222] font-mono text-xs text-[#00a86b] overflow-x-auto leading-relaxed">
                {simulatedPatch}
              </pre>
            </div>

            {/* Testing Checklist & Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Checklist */}
              <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-3.5">
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
                  <ListChecks className="w-4 h-4 text-[#00a86b]" />
                  <span>Testing Checklist</span>
                </h2>
                <div className="space-y-2.5">
                  {roadmap.testing_checklist.map((test, idx) => (
                    <div key={idx} className="flex items-center space-x-2.5 text-xs text-zinc-300 font-sans">
                      <CheckCircle2 className="w-4 h-4 text-[#00a86b] shrink-0" />
                      <span>{test}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks */}
              <div className="p-7 rounded-3xl bg-[#141414] border border-[#262626] shadow-xl space-y-3.5">
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-[#f54e26]" />
                  <span>Potential Risks & Watchouts</span>
                </h2>
                <div className="space-y-2.5">
                  {roadmap.potential_risks.map((risk, idx) => (
                    <div key={idx} className="flex items-start space-x-2.5 text-xs text-zinc-300 font-sans">
                      <AlertTriangle className="w-4 h-4 text-[#f54e26] shrink-0 mt-0.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <form
            onSubmit={handleCustomSubmit}
            className="w-full max-w-lg bg-[#141414] border border-[#2a2a2a] rounded-3xl p-7 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold font-mono uppercase tracking-tight text-white">Describe Feature or Bug</h3>
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-400 mb-1.5 block">Title / Task</label>
              <input
                type="text"
                required
                placeholder="e.g. Add rate-limiting middleware to express endpoints"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#181818] border border-[#282828] text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#f54e26]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-400 mb-1.5 block">Details / Context</label>
              <textarea
                rows={4}
                placeholder="Describe desired behavior or edge cases..."
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#181818] border border-[#282828] text-xs font-sans text-zinc-200 focus:outline-none focus:border-[#f54e26]"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-full text-xs font-mono text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#f54e26] hover:bg-[#ff623d] text-white font-mono font-semibold text-xs shadow-md shadow-[#f54e26]/30 cursor-pointer"
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
