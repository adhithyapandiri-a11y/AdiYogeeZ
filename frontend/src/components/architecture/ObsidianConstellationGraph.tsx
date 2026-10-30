"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import SpriteText from "three-spritetext";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  Sparkles,
  X,
  FileCode,
  Folder,
  Orbit,
  Play,
  Pause,
  Compass,
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  Box,
} from "lucide-react";
import { ObsidianGraphData, ObsidianNode, ObsidianLink } from "@/lib/types";

// Dynamically import react-force-graph-3d to disable SSR for WebGL/Three.js
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#090d16] text-slate-400 font-mono text-xs">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      <span>Initializing 3D WebGL Cosmos engine (react-force-graph)...</span>
    </div>
  ),
});

interface ObsidianGraphProps {
  data: ObsidianGraphData;
  onSelectNode: (node: ObsidianNode) => void;
  selectedFilePath?: string | null;
}

export default function ObsidianConstellationGraph({
  data,
  onSelectNode,
  selectedFilePath,
}: ObsidianGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);

  // Responsive dimensions for 3D canvas
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  // Top Bar & Filtering UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ALL");
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);

  // 3D Controls
  const [autoRotate, setAutoRotate] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [nodeTypeFilter, setNodeTypeFilter] = useState<"all" | "directory" | "file">("all");

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDims = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDims();
    const ro = new ResizeObserver(updateDims);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute available languages
  const availableLanguages = useMemo(() => {
    if (!data?.nodes) return [];
    const langs = new Set<string>();
    data.nodes.forEach((n) => {
      if (n.language) langs.add(n.language);
    });
    return Array.from(langs).sort();
  }, [data]);

  // Format 3D Graph Data
  const graphData = useMemo(() => {
    if (!data || !data.nodes) return { nodes: [], links: [] };

    let filteredNodes = data.nodes;

    // Filter by Language
    if (selectedLanguage !== "ALL") {
      filteredNodes = filteredNodes.filter(
        (n) => n.type === "directory" || (n.language && n.language.toUpperCase() === selectedLanguage.toUpperCase())
      );
    }

    // Filter by Node Type
    if (nodeTypeFilter === "directory") {
      filteredNodes = filteredNodes.filter((n) => n.type === "directory");
    } else if (nodeTypeFilter === "file") {
      filteredNodes = filteredNodes.filter((n) => n.type === "file");
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredNodes = filteredNodes.filter(
        (n) => n.name.toLowerCase().includes(q) || (n.path && n.path.toLowerCase().includes(q))
      );
    }

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = (data.links || []).filter((l) => {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      return nodeIds.has(s) && nodeIds.has(t);
    });

    return {
      nodes: filteredNodes.map((n) => ({
        ...n,
        val: n.type === "directory" ? Math.max(16, 26 - (n.depth || 0) * 3) : (n.size || 8),
      })),
      links: filteredLinks.map((l) => ({
        ...l,
        color:
          l.type === "contains"
            ? "rgba(99, 102, 241, 0.2)"
            : l.type === "has_symbol"
            ? "rgba(56, 189, 248, 0.25)"
            : l.type === "calls"
            ? "rgba(244, 63, 94, 0.75)"
            : "rgba(56, 189, 248, 0.5)",
      })),
    };
  }, [data, selectedLanguage, nodeTypeFilter, searchQuery]);

  // Auto-Orbit (360° Galaxy Revolution in 3D Space)
  useEffect(() => {
    if (!autoRotate) return;
    let angle = 0;
    const distance = 850;
    const interval = setInterval(() => {
      if (!fgRef.current) return;
      angle += Math.PI / 800;
      fgRef.current.cameraPosition({
        x: distance * Math.sin(angle),
        z: distance * Math.cos(angle),
      });
    }, 25);
    return () => clearInterval(interval);
  }, [autoRotate]);

  // Click-to-Focus Smooth Camera Fly-To in 3D
  const handleNodeClick = useCallback(
    (node: any) => {
      onSelectNode(node as ObsidianNode);

      if (fgRef.current && node.x !== undefined && node.y !== undefined && node.z !== undefined) {
        const distance = 160;
        const hyp = Math.hypot(node.x, node.y, node.z) || 1;
        const distRatio = 1 + distance / hyp;
        fgRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          1400
        );
      }
    },
    [onSelectNode]
  );

  // Search Enter key flies directly to matching 3D node
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = graphData.nodes.find(
        (n) => n.name.toLowerCase().includes(q) || (n.path && n.path.toLowerCase().includes(q))
      );
      if (match) {
        handleNodeClick(match);
      }
    }
  };

  // Zoom control handlers
  const handleZoomIn = () => {
    if (!fgRef.current) return;
    const current = fgRef.current.cameraPosition();
    fgRef.current.cameraPosition(
      { x: current.x * 0.75, y: current.y * 0.75, z: current.z * 0.75 },
      undefined,
      600
    );
  };

  const handleZoomOut = () => {
    if (!fgRef.current) return;
    const current = fgRef.current.cameraPosition();
    fgRef.current.cameraPosition(
      { x: current.x * 1.35, y: current.y * 1.35, z: current.z * 1.35 },
      undefined,
      600
    );
  };

  const handleZoomToFit = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(1000, 50);
    }
  };

  const handleResetCamera = () => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 900 }, { x: 0, y: 0, z: 0 }, 1200);
    }
  };

  // Three.js billboard text labels for 3D nodes (SpriteText)
  const handleNodeThreeObject = useCallback(
    (node: any) => {
      if (!showLabels) return new THREE.Object3D();
      const isDir = node.type === "directory";
      const isSymbol = node.type === "symbol";

      // For satellites, only show text label on hover or selection
      if (isSymbol && hoveredNode?.id !== node.id && selectedFilePath !== node.path) {
        return new THREE.Object3D();
      }

      const sprite = new SpriteText(node.name || "");
      sprite.color = isDir ? "#e0e7ff" : "#f1f5f9";
      sprite.textHeight = isDir ? 7 : 4.2;
      sprite.fontFace = "monospace";
      sprite.fontWeight = isDir ? "bold" : "normal";
      sprite.backgroundColor = isDir ? "rgba(15, 23, 42, 0.85)" : "rgba(15, 23, 42, 0.75)";
      sprite.borderColor = node.color || "#6366f1";
      sprite.borderWidth = 0.5;
      sprite.borderRadius = 3;
      sprite.padding = 2;
      sprite.position.y = isDir ? 14 : 9;

      return sprite;
    },
    [showLabels, hoveredNode, selectedFilePath]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#090d16] overflow-hidden select-none"
    >
      {/* 3D Force-Directed Graph WebGL Canvas */}
      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeId="id"
        nodeVal="val"
        nodeColor={(node: any) => node.color || "#6366f1"}
        nodeOpacity={0.92}
        nodeResolution={16}
        nodeThreeObject={handleNodeThreeObject as any}
        nodeThreeObjectExtend={true}
        nodeLabel={(node: any) => `
          <div style="background: rgba(15, 23, 42, 0.95); padding: 8px 12px; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-family: ui-monospace, monospace; font-size: 11px; color: #f8fafc; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="font-weight: bold; color: ${node.color || '#818cf8'}; font-size: 12px;">${node.name}</div>
            <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">${node.type?.toUpperCase()} • ${node.path}</div>
            ${node.language ? `<div style="color: #38bdf8; font-size: 10px; margin-top: 2px;">Language: ${node.language}</div>` : ""}
            ${node.lineCount ? `<div style="color: #cbd5e1; font-size: 10px;">Lines: ${node.lineCount}</div>` : ""}
            ${node.fileCount ? `<div style="color: #a78bfa; font-size: 10px;">Contained files: ${node.fileCount}</div>` : ""}
          </div>
        `}
        onNodeHover={(node: any) => setHoveredNode(node)}
        onNodeClick={handleNodeClick}
        linkColor={(link: any) => link.color}
        linkWidth={(link: any) => (link.type === "contains" ? 0.8 : 1.8)}
        linkDirectionalParticles={
          showParticles
            ? (link: any) => (link.type === "calls" || link.type === "imports" ? 3 : 1)
            : 0
        }
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={(link: any) => (link.type === "calls" ? "#f43f5e" : "#38bdf8")}
        backgroundColor="#090d16"
        showNavInfo={false}
      />

      {/* Floating Top Control HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Search & Filter Toolbar */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search 3D constellation (Enter to fly)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-8.5 pr-8 py-1.5 w-64 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 shadow-xl backdrop-blur-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Node Type Pills */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 text-[11px] font-mono shadow-xl backdrop-blur-md">
            <button
              onClick={() => setNodeTypeFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                nodeTypeFilter === "all"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setNodeTypeFilter("directory")}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                nodeTypeFilter === "directory"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Folder className="w-3 h-3 text-indigo-400" />
              <span>Folders</span>
            </button>
            <button
              onClick={() => setNodeTypeFilter("file")}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                nodeTypeFilter === "file"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode className="w-3 h-3 text-sky-400" />
              <span>Files</span>
            </button>
          </div>

          {/* Language Filter Pills */}
          {availableLanguages.length > 0 && (
            <div className="hidden lg:flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 text-[11px] font-mono shadow-xl backdrop-blur-md">
              <button
                onClick={() => setSelectedLanguage("ALL")}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  selectedLanguage === "ALL"
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All
              </button>
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    selectedLanguage === lang
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: 3D Control Actions */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-xl backdrop-blur-md">
          {/* Auto Rotate Galaxy */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? "Pause 3D rotation" : "Auto-orbit galaxy in 3D"}
            className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors ${
              autoRotate
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Orbit</span>
          </button>

          {/* Toggle Flowing Particles */}
          <button
            onClick={() => setShowParticles(!showParticles)}
            title={showParticles ? "Hide data stream particles" : "Show data stream particles"}
            className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors ${
              showParticles
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Particles</span>
          </button>

          {/* Toggle 3D Labels */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? "Hide text labels" : "Show 3D text labels"}
            className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors ${
              showLabels
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Labels</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800 my-auto mx-0.5" />

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            title="Zoom into 3D cosmos"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            title="Zoom out from 3D cosmos"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Fit to View */}
          <button
            onClick={handleZoomToFit}
            title="Fit 3D constellation to viewport"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Reset Camera */}
          <button
            onClick={handleResetCamera}
            title="Reset 3D camera"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Left 3D Legend HUD */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-md font-mono text-[11px] text-slate-300 space-y-1.5 pointer-events-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-100 border-b border-slate-800/60 pb-1">
            <Orbit className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            <span>3D Obsidian Cosmos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              react-force-graph-3d
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
            <span>Directory Hub (Cluster Center)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
            <span>Source File (Language Colored)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
            <span>Symbol / Method Satellite</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-3 h-0.5 bg-sky-400 inline-block" />
            <span>Flowing Data Packets (Imports & Calls)</span>
          </div>
          <div className="pt-1 text-[10px] text-slate-500 border-t border-slate-800/60">
            Left-Click: Rotate 3D • Right-Click: Pan • Scroll: Zoom
          </div>
        </div>
      </div>

      {/* Bottom Right 3D Stats HUD */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
        <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-xl backdrop-blur-md font-mono text-[11px] text-slate-400 flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <Box className="w-3 h-3 text-indigo-400" />
            <span>
              <strong className="text-slate-200">{graphData.nodes.length}</strong> 3D Nodes
            </span>
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-200">{graphData.links.length}</strong> Edges
          </span>
          <span>•</span>
          <span className="text-emerald-400">60 FPS WebGL</span>
        </div>
      </div>
    </div>
  );
}
