"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { FolderTree, GitFork, Workflow, Boxes, Cpu, ArrowUpRight, Activity, Brain } from "lucide-react";
import ObsidianConstellationGraph from "@/components/architecture/ObsidianConstellationGraph";
import { ProjectStructureView } from "@/components/architecture/ProjectStructureView";
import { DependencyMapView } from "@/components/architecture/DependencyMapView";
import { FeatureFlowView } from "@/components/architecture/FeatureFlowView";
import NodeDetailsDrawer from "@/components/architecture/NodeDetailsDrawer";
import CodeViewerModal from "@/components/common/CodeViewerModal";
import { getRepository, getObsidianGraph } from "@/lib/api";
import { Repository, ObsidianGraphData } from "@/lib/types";

function ArchitectureContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  const [viewMode, setViewMode] = useState<"neural" | "structure" | "dependency" | "flow">("neural");
  const [repo, setRepo] = useState<Repository | null>(null);
  const [neuralData, setNeuralData] = useState<ObsidianGraphData | null>(null);
  const [loadingNeural, setLoadingNeural] = useState(false);

  // Inspected node for drawer
  const [inspectedPath, setInspectedPath] = useState<string | null>(null);

  // Full code viewer modal
  const [fullCodeFile, setFullCodeFile] = useState<string | null>(null);

  useEffect(() => {
    if (!repoId || isNaN(repoId)) return;
    getRepository(repoId)
      .then(setRepo)
      .catch((err) => console.error("Failed to load repo info:", err));

    setLoadingNeural(true);
    getObsidianGraph(repoId)
      .then((data) => {
        setNeuralData(data);
      })
      .catch((err) => console.error("Failed to load neural graph:", err))
      .finally(() => setLoadingNeural(false));
  }, [repoId]);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-[#090d16] flex flex-col overflow-hidden">
      {/* Top 4-Mode Switcher Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => {
                setViewMode("neural");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "neural"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-white/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-violet-300" />
              <span>Neural AST Map</span>
            </button>

            <button
              onClick={() => {
                setViewMode("structure");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "structure"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5 text-indigo-200" />
              <span>Project Structure</span>
            </button>

            <button
              onClick={() => {
                setViewMode("dependency");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "dependency"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-sky-200" />
              <span>Dependency Map</span>
            </button>

            <button
              onClick={() => {
                setViewMode("flow");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "flow"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Workflow className="w-3.5 h-3.5 text-violet-200" />
              <span>Feature Flow</span>
            </button>
          </div>
        </div>

        {/* Canonical Repository Metrics */}
        {repo && (
          <div className="hidden md:flex items-center space-x-4 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                <strong className="text-slate-200">{repo.file_count}</strong> files
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>
                <strong className="text-slate-200">{repo.function_count}</strong> functions
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-violet-400" />
              <span>
                <strong className="text-slate-200">{repo.dependency_count}</strong> dependencies
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Exploration View Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        {viewMode === "neural" && (
          loadingNeural ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-[#080c15] text-slate-400 font-mono text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              <span>Synthesizing repository neural AST network...</span>
            </div>
          ) : neuralData ? (
            <ObsidianConstellationGraph
              data={neuralData}
              onSelectNode={(node) => {
                if (node.path) {
                  setInspectedPath(node.path);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono">
              No neural graph available for this repository.
            </div>
          )
        )}

        {viewMode === "structure" && (
          <ProjectStructureView
            repoId={repoId}
            onSelectFile={(path) => setInspectedPath(path)}
            selectedFilePath={inspectedPath}
          />
        )}

        {viewMode === "dependency" && (
          <DependencyMapView
            repoId={repoId}
            onSelectFile={(path) => setInspectedPath(path)}
            selectedFilePath={inspectedPath}
            onOpenFileViewer={(path) => setFullCodeFile(path)}
          />
        )}

        {viewMode === "flow" && (
          <FeatureFlowView
            repoId={repoId}
            onOpenFileViewer={(path) => setFullCodeFile(path)}
          />
        )}

        {/* Slide-out Inspector Drawer */}
        <NodeDetailsDrawer
          repoId={repoId}
          filePath={inspectedPath}
          onClose={() => setInspectedPath(null)}
          onOpenFullCode={(path) => setFullCodeFile(path)}
          onSelectRelatedFile={(path) => setInspectedPath(path)}
        />

        {/* Full Code Viewer Modal */}
        <CodeViewerModal
          repoId={repoId}
          filePath={fullCodeFile}
          onClose={() => setFullCodeFile(null)}
        />
      </div>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center bg-[#090d16] text-slate-400 font-mono text-xs">
          Loading Architecture Explorer...
        </div>
      }
    >
      <ArchitectureContent />
    </Suspense>
  );
}
