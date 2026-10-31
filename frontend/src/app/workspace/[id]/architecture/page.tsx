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
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#0d0d0d] text-zinc-400 font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-[#f54e26]/30 border-t-[#f54e26] animate-spin" />
        <span>Loading 3D Obsidian Cosmos constellation network...</span>
      </div>
    ),
  }
);

function ArchitectureContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  const [viewMode, setViewMode] = useState<"obsidian" | "map" | "structure">("obsidian");
  const [repo, setRepo] = useState<Repository | null>(null);
  const [obsidianData, setObsidianData] = useState<ObsidianGraphData | null>(null);
  const [obsidianLoading, setObsidianLoading] = useState(true);

  // Inspected node for drawer
  const [inspectedPath, setInspectedPath] = useState<string | null>(null);

  // Guided tour state in Obsidian Constellation View
  const [isTourActive, setIsTourActive] = useState(false);

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
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#0d0d0d] flex flex-col overflow-hidden select-none">
      {/* Top 3-Mode Architecture Switcher Bar */}
      <div className="h-14 border-b border-[#222222] bg-[#121212]/95 backdrop-blur-md px-5 flex items-center justify-between gap-3 overflow-x-auto shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 p-1 rounded-full bg-[#181818] border border-[#262626] text-xs font-mono">
            {/* 1. Obsidian Cosmos */}
            <button
              onClick={() => {
                setViewMode("obsidian");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                viewMode === "obsidian"
                  ? "bg-[#f54e26] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>Obsidian Cosmos</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30 text-white font-bold">
                3D
              </span>
            </button>

            {/* 2. Interactive Repository Map */}
            <button
              onClick={() => {
                setViewMode("map");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                viewMode === "map"
                  ? "bg-[#f54e26] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Repository Map</span>
            </button>

            {/* 3. Hierarchy Tree */}
            <button
              onClick={() => {
                setViewMode("structure");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                viewMode === "structure"
                  ? "bg-[#f54e26] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Hierarchy</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#00a86b]/20 text-[#00a86b] font-medium">
                GitDiagram
              </span>
            </button>
          </div>
        </div>

        {/* Canonical Repository Metrics */}
        {repo && (
          <div className="hidden md:flex items-center space-x-4 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-[#f54e26]" />
              <span>
                <strong className="text-white">{repo.file_count}</strong>{" "}
                files
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#f9bf28]" />
              <span>
                <strong className="text-white">{repo.function_count}</strong>{" "}
                functions
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#00a86b]" />
              <span>
                <strong className="text-white">
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
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#0d0d0d] text-zinc-400 font-mono text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-[#f54e26]/30 border-t-[#f54e26] animate-spin" />
              <span>Simulating 3D Obsidian Cosmos constellation network...</span>
            </div>
          ) : obsidianData ? (
            <ObsidianConstellationGraph
              data={obsidianData}
              onSelectNode={(node: ObsidianNode) => {
                if (!isTourActive && node.path) setInspectedPath(node.path);
              }}
              onTourActiveChange={(active) => {
                setIsTourActive(active);
                if (active) setInspectedPath(null);
              }}
              selectedFilePath={inspectedPath}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
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

        {/* VIEW 3: Hierarchy Tree */}
        {viewMode === "structure" && (
          <ProjectStructureView
            repoId={repoId}
            onSelectFile={(path) => setInspectedPath(path)}
            selectedFilePath={inspectedPath}
          />
        )}

        {/* Slide-out Inspector Drawer (hidden during 30s guided tour to avoid blocking map) */}
        {!isTourActive && inspectedPath && (
          <NodeDetailsDrawer
            repoId={repoId}
            filePath={inspectedPath}
            onClose={() => setInspectedPath(null)}
            onOpenFullCode={(path) => setFullCodeFile(path)}
            onSelectRelatedFile={(path) => setInspectedPath(path)}
          />
        )}

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
        <div className="w-full h-full flex items-center justify-center bg-[#0d0d0d] text-zinc-400 font-mono text-xs">
          Loading Architecture Explorer...
        </div>
      }
    >
      <ArchitectureContent />
    </Suspense>
  );
}
