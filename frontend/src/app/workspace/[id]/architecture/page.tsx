"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  Orbit, 
  FolderTree, 
  Network, 
  Boxes, 
  Cpu, 
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { RepositoryMapView } from "@/components/architecture/RepositoryMapView";
import { ProjectStructureView } from "@/components/architecture/ProjectStructureView";
import NodeDetailsDrawer from "@/components/architecture/NodeDetailsDrawer";
import CodeViewerModal from "@/components/common/CodeViewerModal";
import { getRepository, getObsidianGraph } from "@/lib/api";
import { Repository, ObsidianGraphData, ObsidianNode } from "@/lib/types";

const ObsidianConstellationGraph = dynamic(
  () => import("@/components/architecture/ObsidianConstellationGraph"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#090d16] text-slate-400 font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <span>Loading 3D Obsidian Cosmos constellation network...</span>
      </div>
    ),
  }
);

function ArchitectureContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  // 3 Flagship Architecture Modes:
  // 1. Obsidian Cosmos (3D Force-Directed Graph via react-force-graph-3d)
  // 2. Repository Map (Interactive 2D Architecture Map)
  // 3. Hierarchy (GitDiagram interactive containment & system flowchart)
  const [viewMode, setViewMode] = useState<"obsidian" | "map" | "structure">("obsidian");
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
      {/* Top 3-Mode Architecture Switcher Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between gap-3 overflow-x-auto shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            {/* 1. Obsidian Cosmos (3D WebGL Constellation via react-force-graph) */}
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
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold">
                3D
              </span>
            </button>

            {/* 2. Interactive Repository Map (Restored) */}
            <button
              onClick={() => {
                setViewMode("map");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "map"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Network className="w-3.5 h-3.5 text-indigo-300" />
              <span>Repository Map</span>
            </button>

            {/* 3. Hierarchy Tree (GitDiagram format) */}
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
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                GitDiagram
              </span>
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
                <strong className="text-slate-200">{repo.function_count}</strong>{" "}
                functions
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-pink-400" />
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
      <div className="flex-1 relative min-w-0 w-full h-full overflow-hidden">
        {/* VIEW 1: 3D Obsidian Cosmos Graph */}
        {viewMode === "obsidian" && (
          obsidianLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#090d16] text-slate-400 font-mono text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              <span>Simulating 3D Obsidian Cosmos constellation network...</span>
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

        {/* VIEW 2: Interactive Repository Map (Restored) */}
        {viewMode === "map" && (
          <RepositoryMapView
            repoId={repoId}
            repository={repo}
            selectedFilePath={inspectedPath}
            onSelectFile={setInspectedPath}
          />
        )}

        {/* VIEW 3: Hierarchy (GitDiagram format) */}
        {viewMode === "structure" && (
          <ProjectStructureView
            repoId={repoId}
            onSelectFile={(path) => setInspectedPath(path)}
            selectedFilePath={inspectedPath}
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
