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
  ShieldAlert
} from "lucide-react";
import { getIssues, generateContributionRoadmap } from "@/lib/api";
import { GitHubIssue, ContributionRoadmap } from "@/lib/types";

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
      setRoadmap(resp.roadmap);
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
      url: ""
    };
    setShowCustomModal(false);
    handleSelectIssue(customIssue);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-[#090d16] text-slate-100">
      {/* Left Issues Selector */}
      <div className="w-88 border-r border-white/10 bg-[#0c121e]/90 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Select an Issue</span>
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
                  // Re-trigger roadmap with new mode
                  setLoadingRoadmap(true);
                  generateContributionRoadmap(repoId, selectedIssue.number, selectedIssue.title, selectedIssue.body, nextMode)
                    .then((r) => setRoadmap(r.roadmap))
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

        {/* Issue List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {issues.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No open GitHub issues found. Click "+ Custom" above to enter any feature or bug you want to tackle!
            </div>
          ) : (
            issues.map((iss) => {
              const isSelected = selectedIssue?.number === iss.number;
              return (
                <button
                  key={iss.number}
                  onClick={() => handleSelectIssue(iss)}
                  className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col space-y-1.5 border ${
                    isSelected
                      ? "bg-cyan-600/20 border-cyan-500/30 text-slate-100 shadow-md shadow-cyan-500/5"
                      : "bg-[#0f172a]/60 hover:bg-slate-800/80 border-white/5 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-cyan-400">
                      #{iss.number}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {iss.created_at ? new Date(iss.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>

                  <div className="font-medium text-slate-200 line-clamp-2 leading-relaxed">
                    {iss.title}
                  </div>

                  {iss.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {iss.labels.slice(0, 2).map((l, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-white/5">
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
              <span>RepoMind AI is formulating contribution roadmap and identifying target files...</span>
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
                      <div className="font-mono text-xs font-semibold text-indigo-300 break-all">
                        {tf.file_path}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {tf.reason}
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenCode(tf.file_path)}
                      className="self-start text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 pt-1 font-medium"
                    >
                      <span>View File Source</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-Column Grid: Investigation Steps & Implementation Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Investigation Steps */}
              <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xl space-y-3">
                <h2 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Step-by-Step Investigation</span>
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
                  <Layers className="w-4 h-4 text-violet-400" />
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
