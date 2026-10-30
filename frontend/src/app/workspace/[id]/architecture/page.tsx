"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { 
  Orbit, 
  FolderTree, 
  GitFork, 
  Workflow, 
  Boxes, 
  Cpu, 
  ArrowUpRight,
  Sparkles,
  Network
} from "lucide-react";
import ObsidianConstellationGraph from "@/components/architecture/ObsidianConstellationGraph";
import { RepositoryMapView } from "@/components/architecture/RepositoryMapView";
import { ProjectStructureView } from "@/components/architecture/ProjectStructureView";
import { DependencyMapView } from "@/components/architecture/DependencyMapView";
import { FeatureFlowView } from "@/components/architecture/FeatureFlowView";
import NodeDetailsDrawer from "@/components/architecture/NodeDetailsDrawer";
import CodeViewerModal from "@/components/common/CodeViewerModal";
import { getRepository, getObsidianGraph } from "@/lib/api";
import { Repository, ObsidianGraphData, ObsidianNode } from "@/lib/types";

function ArchitectureContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  // Default to the flagship Obsidian Cosmos Graph, with Repository Map also available
  const [viewMode, setViewMode] = useState<"obsidian" | "map" | "structure" | "dependency" | "flow">("obsidian");
  const [repo, setRepo] = useState<Repository | null>(null);
  const [obsidianData, setObsidianData] = useState<ObsidianGraphData | null>(null);
  const [obsidianLoading, setObsidianLoading] = useState(true);

  // Inspected node for drawer
  const [inspectedPath, setInspectedPath] = useState<string | null>(null);

  // Full code viewer modal
  const [fullCodeFile, setFullCodeFile] = useState<string | null>(null);

  useEffect(() => {
    if (!repoId || isNaN(repoId)) return;
    
    getRepository(repoId)
      .then(setRepo)
      .catch((err) => console.error("Failed to load repo info:", err));

    setObsidianLoading(true);
    getObsidianGraph(repoId)
      .then((data) => {
        setObsidianData(data);
        setObsidianLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load obsidian data:", err);
        setObsidianLoading(false);
      });
  }, [repoId]);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-[#090d16] flex flex-col overflow-hidden">
      {/* Top 5-Mode Switcher Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between gap-3 overflow-x-auto shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            {/* 1. Obsidian Cosmos Graph (Flagship) */}
            <button
              onClick={() => {
                setViewMode("obsidian");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "obsidian"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Orbit className="w-3.5 h-3.5 text-indigo-300" />
              <span>Obsidian Cosmos</span>
            </button>

            {/* 2. Interactive Repository Map (PR #1) */}
            <button
              onClick={() => {
                setViewMode("map");
                setInspectedPath(null);
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-semibold transition-colors ${
                viewMode === "map"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-pressed={viewMode === "map"}
            >
              <Network className="h-3.5 w-3.5 text-indigo-300" />
              <span>Repository Map</span>
            </button>

            {/* 3. Hierarchy Tree */}
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
              <FolderTree className="w-3.5 h-3.5 text-indigo-300" />
              <span>Hierarchy</span>
            </button>

            {/* 4. Dependency Map */}
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
              <GitFork className="w-3.5 h-3.5 text-sky-300" />
              <span>Dependency Map</span>
            </button>

            {/* 5. Feature Flow */}
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
              <Workflow className="w-3.5 h-3.5 text-violet-300" />
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
                <strong className="text-slate-200">{repo.file_count}</strong>{" "}
                files
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>
                <strong className="text-slate-200">
                  {repo.function_count}
                </strong>{" "}
                functions
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-violet-400" />
              <span>
                <strong className="text-slate-200">
                  {repo.dependency_count}
                </strong>{" "}
                dependencies
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Exploration View Area */}
      {/* Main Exploration View Area */}
      <div className="flex-1 relative min-w-0 w-full h-full overflow-hidden">
        {/* VIEW 1: Obsidian Cosmos Graph */}
        {viewMode === "obsidian" && (
          obsidianLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#090d16] text-slate-400 font-mono text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              <span>Simulating Obsidian Cosmos constellation network...</span>
            </div>
          ) : obsidianData ? (
            <ObsidianConstellationGraph
              data={obsidianData}
              onSelectNode={(node: ObsidianNode) => {
                if (node.path) setInspectedPath(node.path);
              }}
              selectedFilePath={inspectedPath}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">
              Failed to load Obsidian graph data.
            </div>
          )
        )}

        {/* VIEW 2: Interactive Repository Map */}
        {viewMode === "map" && (
          <RepositoryMapView
            repoId={repoId}
            repository={repo}
            selectedFilePath={inspectedPath}
            onSelectFile={setInspectedPath}
          />
        )}
        {viewMode === "structure" && (
          <ProjectStructureView
            repoId={repoId}
            onSelectFile={(path) => setInspectedPath(path)}
            selectedFilePath={inspectedPath}
          />
        )}

        {/* VIEW 3: Dependency Map */}
        {viewMode === "dependency" && (
          <DependencyMapView
            repoId={repoId}
            onSelectFile={(path) => setInspectedPath(path)}
            selectedFilePath={inspectedPath}
            onOpenFileViewer={(path) => setFullCodeFile(path)}
          />
        )}

        {/* VIEW 4: Feature Flow */}
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
