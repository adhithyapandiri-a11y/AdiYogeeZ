"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Orbit,
  FolderTree,
  GitFork,
  Workflow,
  Boxes,
  Cpu,
  ArrowUpRight,
} from "lucide-react";
import { ProjectStructureView } from "@/components/architecture/ProjectStructureView";
import { DependencyMapView } from "@/components/architecture/DependencyMapView";
import { FeatureFlowView } from "@/components/architecture/FeatureFlowView";
import NodeDetailsDrawer from "@/components/architecture/NodeDetailsDrawer";
import CodeViewerModal from "@/components/common/CodeViewerModal";
import { getRepository, getObsidianGraph } from "@/lib/api";
import NeuralMap from "@/components/neural/NeuralMap";
import { Repository, ObsidianGraphData, ObsidianNode } from "@/lib/types";

const ObsidianConstellationGraph = dynamic(
  () => import("@/components/architecture/ObsidianConstellationGraph"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#101010] text-[#AAA79D] font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <span>Loading Obsidian Cosmos constellation network...</span>
      </div>
    ),
  },
);

function ArchitectureContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  // The 3D Neural Map is the default; retain all existing architecture views.
  const [viewMode, setViewMode] = useState<
    "neural" | "obsidian" | "structure" | "dependency" | "flow"
  >("neural");
  const [repo, setRepo] = useState<Repository | null>(null);
  const [obsidianData, setObsidianData] = useState<ObsidianGraphData | null>(
    null,
  );
  const [obsidianLoading, setObsidianLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [graphError, setGraphError] = useState("");

  // Inspected node for drawer
  const [inspectedPath, setInspectedPath] = useState<string | null>(null);

  // Full code viewer modal
  const [fullCodeFile, setFullCodeFile] = useState<string | null>(null);

  useEffect(() => {
    if (!repoId || isNaN(repoId)) return;

    let current = true;
    getRepository(repoId)
      .then((result) => {
        if (current) setRepo(result);
      })
      .catch((err) => console.error("Failed to load repo info:", err));

    getObsidianGraph(repoId)
      .then((data) => {
        if (!current) return;
        setObsidianData(data);
        setObsidianLoading(false);
      })
      .catch((err) => {
        if (!current) return;
        setGraphError(
          err instanceof Error
            ? err.message
            : "Could not load the repository graph.",
        );
        setObsidianLoading(false);
      });
    return () => {
      current = false;
    };
  }, [repoId, retry]);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-[#101010] flex flex-col overflow-hidden">
      {/* Top 4-Mode Switcher Bar */}
      <div className="h-14 border-b border-[#333333]/80 bg-[#191919] backdrop-blur-md px-4 flex items-center justify-between gap-3 overflow-x-auto shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-[#242424] border border-[#333333] text-xs font-mono">
            {/* Neural map and existing architecture views */}
            <button
              onClick={() => setViewMode("neural")}
              aria-pressed={viewMode === "neural"}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-semibold ${viewMode === "neural" ? "bg-[#E8E4D3] text-[#101010]" : "text-[#AAA79D] hover:text-[#E8E4D3]"}`}
            >
              <Orbit size={15} />
              Neural Map
            </button>
            <button
              onClick={() => {
                setViewMode("obsidian");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "obsidian"
                  ? "bg-[#E8E4D3] text-[#101010] shadow-md shadow-indigo-600/25"
                  : "text-[#AAA79D] hover:text-[#E8E4D3]"
              }`}
            >
              <Orbit className="w-3.5 h-3.5 text-[#AAA79D]" />
              <span>Obsidian Cosmos</span>
            </button>

            {/* 2. Hierarchy Tree (GitDiagram format) */}
            <button
              onClick={() => {
                setViewMode("structure");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "structure"
                  ? "bg-[#E8E4D3] text-[#101010] shadow-md shadow-indigo-600/25"
                  : "text-[#AAA79D] hover:text-[#E8E4D3]"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5 text-[#AAA79D]" />
              <span>Hierarchy</span>
            </button>

            {/* 3. Dependency Map */}
            <button
              onClick={() => {
                setViewMode("dependency");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "dependency"
                  ? "bg-[#E8E4D3] text-[#101010] shadow-md shadow-indigo-600/25"
                  : "text-[#AAA79D] hover:text-[#E8E4D3]"
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-[#AAA79D]" />
              <span>Dependency Map</span>
            </button>

            {/* 4. Feature Flow */}
            <button
              onClick={() => {
                setViewMode("flow");
                setInspectedPath(null);
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "flow"
                  ? "bg-[#E8E4D3] text-[#101010] shadow-md shadow-indigo-600/25"
                  : "text-[#AAA79D] hover:text-[#E8E4D3]"
              }`}
            >
              <Workflow className="w-3.5 h-3.5 text-[#AAA79D]" />
              <span>Feature Flow</span>
            </button>
          </div>
        </div>

        {/* Canonical Repository Metrics */}
        {repo && (
          <div className="hidden md:flex items-center space-x-4 text-xs text-[#AAA79D] font-mono">
            <div className="flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-[#AAA79D]" />
              <span>
                <strong className="text-[#E8E4D3]">{repo.file_count}</strong>{" "}
                files
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#AAA79D]" />
              <span>
                <strong className="text-[#E8E4D3]">
                  {repo.function_count}
                </strong>{" "}
                functions
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#AAA79D]" />
              <span>
                <strong className="text-[#E8E4D3]">
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
        {viewMode === "neural" &&
          (obsidianLoading ? (
            <div className="neural-empty" role="status">
              Loading indexed repository structure…
            </div>
          ) : obsidianData && !graphError ? (
            <NeuralMap
              key={repoId}
              data={obsidianData}
              repoId={repoId}
              name={repo ? `${repo.owner}/${repo.name}` : "Repository"}
              selectedFilePath={inspectedPath}
              onSelectFile={setInspectedPath}
            />
          ) : (
            <div className="neural-empty" role="alert">
              <p>{graphError || "No repository graph is available."}</p>
              <button
                className="home-outline"
                onClick={() => {
                  setObsidianLoading(true);
                  setGraphError("");
                  setRetry((n) => n + 1);
                }}
              >
                Retry graph
              </button>
            </div>
          ))}
        {/* VIEW 1: Obsidian Cosmos Graph */}
        {viewMode === "obsidian" &&
          (obsidianLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#101010] text-[#AAA79D] font-mono text-xs">
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
          ))}

        {/* VIEW 2: Hierarchy (GitDiagram format) */}
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
        <div className="w-full h-full flex items-center justify-center bg-[#101010] text-[#AAA79D] font-mono text-xs">
          Loading Architecture Explorer...
        </div>
      }
    >
      <ArchitectureContent />
    </Suspense>
  );
}
