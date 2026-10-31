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
  SkipForward,
  SkipBack,
  CheckCircle2,
} from "lucide-react";
import { ObsidianGraphData, ObsidianNode, ObsidianLink } from "@/lib/types";

// Dynamically import react-force-graph-3d to disable SSR for WebGL/Three.js
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#0d0d0d] text-zinc-400 font-mono text-xs">
      <div className="w-8 h-8 rounded-full border-2 border-[#f54e26]/30 border-t-[#f54e26] animate-spin" />
      <span>Initializing 3D WebGL Cosmos engine (react-force-graph)...</span>
    </div>
  ),
});

interface ObsidianGraphProps {
  data: ObsidianGraphData;
  onSelectNode: (node: ObsidianNode) => void;
  selectedFilePath?: string | null;
  onTourActiveChange?: (active: boolean) => void;
}

export interface TourStep {
  id: string;
  stageName: string;
  badge: string;
  title: string;
  targetNodeId: string | null;
  targetPath?: string;
  description: string;
  architecturalInsight: string;
  distance: number;
}

export default function ObsidianConstellationGraph({
  data,
  onSelectNode,
  selectedFilePath,
  onTourActiveChange,
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

  // --- IDEA #4: 30-SECOND GUIDED TOUR (ARCHITECTURE STORYTELLER) STATE ---
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [isTourPaused, setIsTourPaused] = useState(false);
  const [tourProgress, setTourProgress] = useState(0);
  const tourIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tourProgressRef = useRef<NodeJS.Timeout | null>(null);

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

  // Generate dynamic 5-stage architecture tour steps based on AST graph nodes
  const tourSteps: TourStep[] = useMemo(() => {
    if (!data?.nodes || data.nodes.length === 0) return [];

    const nodes = data.nodes;
    const usedIds = new Set<string>();

    const findNode = (keywords: string[]): ObsidianNode | null => {
      for (const kw of keywords) {
        const match = nodes.find(
          (n) => !usedIds.has(n.id) && n.type === "file" && n.name.toLowerCase().includes(kw)
        );
        if (match) return match;
      }
      for (const kw of keywords) {
        const match = nodes.find(
          (n) => !usedIds.has(n.id) && (n.path || "").toLowerCase().includes(kw)
        );
        if (match) return match;
      }
      return null;
    };

    // 1. Entrypoint (main, index, app, server, entry)
    const entryNode = findNode(["main", "index", "app", "server", "entry"]) || nodes[0];
    if (entryNode) usedIds.add(entryNode.id);

    // 2. Dispatch / Router (route, api, controller, router, endpoint)
    const routerNode = findNode(["route", "api", "controller", "router", "endpoint"]) || 
      nodes.find(n => !usedIds.has(n.id) && (n.inDegree || 0) > 1) || nodes[1] || entryNode;
    if (routerNode) usedIds.add(routerNode.id);

    // 3. Core Business Engine (service, core, engine, auth, logic, lib)
    const serviceNode = findNode(["service", "core", "engine", "auth", "logic", "workflow", "lib"]) ||
      nodes.find(n => !usedIds.has(n.id) && (n.outDegree || 0) > 2) || nodes[2] || routerNode;
    if (serviceNode) usedIds.add(serviceNode.id);

    // 4. Persistence Layer (db, model, schema, database, entity, store)
    const dbNode = findNode(["db", "model", "schema", "database", "entity", "store", "repo"]) ||
      nodes.find(n => !usedIds.has(n.id) && n.type === "file") || nodes[3] || serviceNode;
    if (dbNode) usedIds.add(dbNode.id);

    return [
      {
        id: "step-1-entry",
        stageName: "Stage 1: The Front Door",
        badge: "ENTRYPOINT",
        title: entryNode ? `${entryNode.name} — Application Bootstrapper` : "Application Entrypoint",
        targetNodeId: entryNode ? entryNode.id : null,
        targetPath: entryNode?.path,
        description: "Execution begins here. Environment variables are parsed, middleware pipelines are registered, and network listeners are initialized.",
        architecturalInsight: "AST Analysis: Primary bootstrap node with root dependency fan-out.",
        distance: 170
      },
      {
        id: "step-2-router",
        stageName: "Stage 2: Traffic Controller",
        badge: "DISPATCH LAYER",
        title: routerNode ? `${routerNode.name} — API Routing & Handlers` : "API Routing Layer",
        targetNodeId: routerNode ? routerNode.id : null,
        targetPath: routerNode?.path,
        description: "Incoming HTTP requests and WebSocket connections are validated and routed to corresponding controllers.",
        architecturalInsight: "Decoupled transport interface keeping protocol handling distinct from domain logic.",
        distance: 170
      },
      {
        id: "step-3-core",
        stageName: "Stage 3: The Engine",
        badge: "BUSINESS LOGIC",
        title: serviceNode ? `${serviceNode.name} — Core Domain Engine` : "Core Business Logic",
        targetNodeId: serviceNode ? serviceNode.id : null,
        targetPath: serviceNode?.path,
        description: "Central processing layer executing business policies, authentication checks, computational logic, and background tasks.",
        architecturalInsight: "High central cohesion with incoming callers from routes and outbound calls to storage.",
        distance: 170
      },
      {
        id: "step-4-db",
        stageName: "Stage 4: The Vault",
        badge: "PERSISTENCE",
        title: dbNode ? `${dbNode.name} — Database & Schemas` : "Data Persistence Layer",
        targetNodeId: dbNode ? dbNode.id : null,
        targetPath: dbNode?.path,
        description: "Relational database tables, ORM models, migration definitions, and persistence repositories store application state.",
        architecturalInsight: "Lowest layer in the dependency DAG; leaf entities with zero reverse upstream dependencies.",
        distance: 170
      },
      {
        id: "step-5-cosmos",
        stageName: "Stage 5: Overview",
        badge: "SYSTEM GALAXY",
        title: "Complete Architecture Cosmos",
        targetNodeId: null,
        description: "Tour complete! You now understand how data and control flow across the full application topology.",
        architecturalInsight: "The 3D knowledge graph is now fully interactive. Click any node to inspect callers, functions, and line-level code.",
        distance: 850
      }
    ];
  }, [data?.nodes]);

  // Navigate to specific tour step
  const navigateToTourStep = useCallback((stepIndex: number) => {
    if (!tourSteps || tourSteps.length === 0) return;
    const safeIndex = Math.max(0, Math.min(stepIndex, tourSteps.length - 1));
    setTourStepIndex(safeIndex);
    setTourProgress(0);

    const step = tourSteps[safeIndex];
    if (!fgRef.current) return;

    if (step.targetNodeId) {
      const targetNode = graphData.nodes.find((n) => n.id === step.targetNodeId) as any;
      if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined && targetNode.z !== undefined) {
        const distance = step.distance || 170;
        const hyp = Math.hypot(targetNode.x, targetNode.y, targetNode.z) || 1;
        const distRatio = 1 + distance / hyp;
        fgRef.current.cameraPosition(
          { x: targetNode.x * distRatio, y: targetNode.y * distRatio + 25, z: targetNode.z * distRatio },
          targetNode,
          1500
        );
        // Do not call onSelectNode here during guided cam so template drawer doesn't block map view
        return;
      }
    }

    // Default overview camera fly-back
    fgRef.current.cameraPosition({ x: 0, y: 0, z: 900 }, { x: 0, y: 0, z: 0 }, 1500);
  }, [tourSteps, graphData.nodes]);

  // Tour Controller: Start Guided Tour
  const startGuidedTour = () => {
    setIsTourActive(true);
    setIsTourPaused(false);
    setAutoRotate(false);
    onTourActiveChange?.(true);
    navigateToTourStep(0);
  };

  // Tour Controller: Exit Tour
  const exitGuidedTour = () => {
    setIsTourActive(false);
    setIsTourPaused(false);
    setTourProgress(0);
    if (tourIntervalRef.current) clearTimeout(tourIntervalRef.current);
    if (tourProgressRef.current) clearInterval(tourProgressRef.current);
    onTourActiveChange?.(false);

    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 900 }, { x: 0, y: 0, z: 0 }, 1200);
    }
  };

  // Auto-advance timer (6 seconds per step = ~30s total)
  useEffect(() => {
    if (!isTourActive || isTourPaused) {
      if (tourIntervalRef.current) clearTimeout(tourIntervalRef.current);
      if (tourProgressRef.current) clearInterval(tourProgressRef.current);
      return;
    }

    const stepDuration = 6000;
    const intervalTick = 50;
    let currentMs = 0;

    tourProgressRef.current = setInterval(() => {
      currentMs += intervalTick;
      const pct = Math.min(100, (currentMs / stepDuration) * 100);
      setTourProgress(pct);
    }, intervalTick);

    tourIntervalRef.current = setTimeout(() => {
      if (tourStepIndex < tourSteps.length - 1) {
        navigateToTourStep(tourStepIndex + 1);
      } else {
        exitGuidedTour();
      }
    }, stepDuration);

    return () => {
      if (tourIntervalRef.current) clearTimeout(tourIntervalRef.current);
      if (tourProgressRef.current) clearInterval(tourProgressRef.current);
    };
  }, [isTourActive, isTourPaused, tourStepIndex, tourSteps.length, navigateToTourStep]);

  // Auto-Orbit (360° Galaxy Revolution in 3D Space)
  useEffect(() => {
    if (!autoRotate || isTourActive) return;
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
  }, [autoRotate, isTourActive]);

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

  const currentStep = tourSteps[tourStepIndex];

  // Three.js billboard text labels for 3D nodes (SpriteText)
  const handleNodeThreeObject = useCallback(
    (node: any) => {
      if (!showLabels) return new THREE.Object3D();
      const isDir = node.type === "directory";
      const isSymbol = node.type === "symbol";
      const isTourTarget = isTourActive && currentStep?.targetNodeId === node.id;

      // For satellites, only show text label on hover or selection or tour focus
      if (isSymbol && hoveredNode?.id !== node.id && selectedFilePath !== node.path && !isTourTarget) {
        return new THREE.Object3D();
      }

      const sprite = new SpriteText(node.name || "");
      sprite.color = isTourTarget ? "#38bdf8" : isDir ? "#e0e7ff" : "#f1f5f9";
      sprite.textHeight = isTourTarget ? 9 : isDir ? 7 : 4.2;
      sprite.fontFace = "monospace";
      sprite.fontWeight = isTourTarget || isDir ? "bold" : "normal";
      sprite.backgroundColor = isTourTarget
        ? "rgba(14, 165, 233, 0.4)"
        : isDir
        ? "rgba(15, 23, 42, 0.85)"
        : "rgba(15, 23, 42, 0.75)";
      sprite.borderColor = isTourTarget ? "#38bdf8" : node.color || "#6366f1";
      sprite.borderWidth = isTourTarget ? 1.5 : 0.5;
      sprite.borderRadius = 3;
      sprite.padding = 2;
      sprite.position.y = isDir ? 14 : 9;

      return sprite;
    },
    [showLabels, hoveredNode, selectedFilePath, isTourActive, currentStep]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0d0d0d] overflow-hidden select-none"
    >
      {/* 3D Force-Directed Graph WebGL Canvas */}
      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeId="id"
        nodeVal="val"
        nodeColor={(node: any) =>
          isTourActive && currentStep?.targetNodeId === node.id
            ? "#f54e26"
            : node.color || "#f54e26"
        }
        nodeOpacity={0.92}
        nodeResolution={16}
        nodeThreeObject={handleNodeThreeObject as any}
        nodeThreeObjectExtend={true}
        nodeLabel={(node: any) => `
          <div style="background: rgba(20, 20, 20, 0.95); padding: 10px 14px; border: 1px solid #262626; border-radius: 12px; font-family: ui-monospace, monospace; font-size: 11px; color: #f4f4f5; box-shadow: 0 10px 30px rgba(0,0,0,0.7);">
            <div style="font-weight: bold; color: ${node.color || '#f54e26'}; font-size: 12px;">${node.name}</div>
            <div style="color: #a1a1aa; font-size: 10px; margin-top: 3px;">${node.type?.toUpperCase()} • ${node.path}</div>
            ${node.language ? `<div style="color: #f54e26; font-size: 10px; margin-top: 3px;">Language: ${node.language}</div>` : ""}
            ${node.lineCount ? `<div style="color: #e4e4e7; font-size: 10px;">Lines: ${node.lineCount}</div>` : ""}
            ${node.fileCount ? `<div style="color: #f9bf28; font-size: 10px;">Contained files: ${node.fileCount}</div>` : ""}
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
        linkDirectionalParticleColor={(link: any) => (link.type === "calls" ? "#f54e26" : "#f9bf28")}
        backgroundColor="#0d0d0d"
        showNavInfo={false}
      />

      {/* Floating Top Control HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Search & Filter Toolbar (hidden during tour) */}
        {!isTourActive ? (
          <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search 3D constellation (Enter to fly)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 pr-8 py-2 w-64 rounded-full bg-[#141414]/90 border border-[#282828] text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-[#f54e26] shadow-xl backdrop-blur-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Node Type Pills */}
            <div className="flex items-center bg-[#141414]/90 border border-[#282828] rounded-full p-1 text-[11px] font-mono shadow-xl backdrop-blur-md">
              <button
                onClick={() => setNodeTypeFilter("all")}
                className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                  nodeTypeFilter === "all"
                    ? "bg-[#f54e26] text-white font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setNodeTypeFilter("directory")}
                className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer ${
                  nodeTypeFilter === "directory"
                    ? "bg-[#f54e26] text-white font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Folder className="w-3 h-3 text-[#f9bf28]" />
                <span>Folders</span>
              </button>
              <button
                onClick={() => setNodeTypeFilter("file")}
                className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer ${
                  nodeTypeFilter === "file"
                    ? "bg-[#f54e26] text-white font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <FileCode className="w-3 h-3 text-[#f54e26]" />
                <span>Files</span>
              </button>
            </div>

            {/* Language Filter Pills */}
            {availableLanguages.length > 0 && (
              <div className="hidden lg:flex items-center bg-[#141414]/90 border border-[#282828] rounded-full p-1 text-[11px] font-mono shadow-xl backdrop-blur-md">
                <button
                  onClick={() => setSelectedLanguage("ALL")}
                  className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                    selectedLanguage === "ALL"
                      ? "bg-[#f54e26] text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All
                </button>
                {availableLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      selectedLanguage === lang
                        ? "bg-[#f54e26] text-white font-semibold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}

            {/* 30-SECOND GUIDED TOUR HERO BUTTON */}
            <button
              onClick={startGuidedTour}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#f54e26] hover:bg-[#ff623d] text-white text-xs font-mono font-semibold shadow-lg shadow-[#f54e26]/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Start automated 30-second architectural walkthrough"
            >
              <Play className="w-3.5 h-3.5 fill-current text-white" />
              <span>30s Guided Tour</span>
              <Sparkles className="w-3 h-3 text-white fill-white animate-pulse" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={exitGuidedTour}
              className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[#141414]/95 hover:bg-[#1f1f1f] text-white border border-[#f54e26]/50 text-xs font-mono font-semibold backdrop-blur-md shadow-xl transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-[#f54e26]" />
              <span>Exit Guided Tour</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414]/95 border border-[#282828] text-[11px] font-mono text-zinc-400 backdrop-blur-md shadow-md">
              <span className="w-2 h-2 rounded-full bg-[#f54e26] animate-pulse" />
              <span>30s Cinematic Tour Active</span>
            </div>
          </div>
        )}

        {/* Right: 3D Control Actions (hidden during tour) */}
        {!isTourActive && (
          <div className="flex items-center gap-1.5 pointer-events-auto bg-[#141414]/90 border border-[#282828] rounded-full p-1.5 shadow-xl backdrop-blur-md">
            {/* Auto Rotate Galaxy */}
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? "Pause 3D rotation" : "Auto-orbit galaxy in 3D"}
              className={`px-2.5 py-1.5 rounded-full text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                autoRotate
                  ? "bg-[#f54e26]/20 text-[#f54e26] border border-[#f54e26]/40"
                  : "text-zinc-400 hover:text-white hover:bg-[#202020]"
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
                  ? "bg-[#f54e26]/20 text-[#f54e26] border border-[#f54e26]/40"
                  : "text-zinc-400 hover:text-white hover:bg-[#202020]"
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
                  ? "bg-[#f54e26]/20 text-[#f54e26] border border-[#f54e26]/40"
                  : "text-zinc-400 hover:text-white hover:bg-[#202020]"
              }`}
            >
              {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Labels</span>
            </button>

            <div className="w-[1px] h-4 bg-[#2a2a2a] my-auto mx-0.5" />

            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              title="Zoom into 3D cosmos"
              className="p-1.5 rounded-full hover:bg-[#202020] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              title="Zoom out from 3D cosmos"
              className="p-1.5 rounded-full hover:bg-[#202020] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Fit to View */}
            <button
              onClick={handleZoomToFit}
              title="Fit 3D constellation to viewport"
              className="p-1.5 rounded-full hover:bg-[#202020] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Reset Camera */}
            <button
              onClick={handleResetCamera}
              title="Reset 3D camera"
              className="p-1.5 rounded-full hover:bg-[#202020] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* --- IDEA #4: CINEMATIC ARCHITECTURE STORYTELLER HUD (FLOATING BANNER) --- */}
      {isTourActive && currentStep && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-300 font-mono">
          <div className="p-5 rounded-2xl bg-[#141414]/95 border border-[#f54e26]/40 backdrop-blur-2xl shadow-2xl shadow-[#f54e26]/10 space-y-3 relative overflow-hidden">
            {/* Countdown Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#222222]">
              <div 
                className="h-full bg-[#f54e26] transition-all duration-75 ease-linear"
                style={{ width: `${tourProgress}%` }}
              />
            </div>

            {/* Stage Badge & Step Count */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f54e26] animate-pulse" />
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#f54e26]/20 text-[#f54e26] border border-[#f54e26]/30">
                  {currentStep.badge}
                </span>
                <span className="text-xs text-zinc-400">
                  {currentStep.stageName}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
                <span>Step {tourStepIndex + 1} of {tourSteps.length}</span>
                <button
                  onClick={exitGuidedTour}
                  className="p-1 rounded-lg hover:bg-[#202020] text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Close tour"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>{currentStep.title}</span>
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Compiler AST Insight */}
            <div className="p-2.5 rounded-xl bg-[#1a1a1a] border border-[#282828] text-[11px] text-[#f9bf28] flex items-center space-x-2">
              <Compass className="w-3.5 h-3.5 text-[#f9bf28] shrink-0" />
              <span className="truncate">{currentStep.architecturalInsight}</span>
            </div>

            {/* Interactive Player Controls */}
            <div className="flex items-center justify-between pt-1 border-t border-[#222222]">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => navigateToTourStep(tourStepIndex - 1)}
                  disabled={tourStepIndex === 0}
                  className="p-1.5 rounded-lg bg-[#1a1a1a] border border-[#282828] text-zinc-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  title="Previous stage"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsTourPaused(!isTourPaused)}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#282828] text-zinc-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {isTourPaused ? (
                    <>
                      <Play className="w-3 h-3 fill-current text-[#00a86b]" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3 fill-current text-[#f9bf28]" />
                      <span>Pause</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigateToTourStep(tourStepIndex + 1)}
                  disabled={tourStepIndex === tourSteps.length - 1}
                  className="p-1.5 rounded-lg bg-[#1a1a1a] border border-[#282828] text-zinc-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  title="Next stage"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {currentStep.targetPath && (
                <button
                  onClick={() => {
                    const node = graphData.nodes.find((n) => n.id === currentStep.targetNodeId);
                    if (node) {
                      exitGuidedTour();
                      onSelectNode(node as ObsidianNode);
                    }
                  }}
                  className="text-xs text-[#f54e26] hover:text-[#ff623d] flex items-center space-x-1 transition cursor-pointer"
                >
                  <span>Inspect Code</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Left 3D Legend HUD (hidden during tour) */}
      {!isTourActive && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
          <div className="p-3.5 rounded-2xl bg-[#141414]/90 border border-[#282828] shadow-2xl backdrop-blur-md font-mono text-[11px] text-zinc-300 space-y-1.5 pointer-events-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-white border-b border-[#282828] pb-1.5">
              <Orbit className="w-3.5 h-3.5 text-[#f54e26] animate-spin" />
              <span>3D Obsidian Cosmos</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#f54e26]/10 text-[#f54e26] border border-[#f54e26]/30">
                react-force-graph-3d
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f54e26] shadow-sm shadow-[#f54e26]" />
              <span>Directory Hub (Cluster Center)</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-[#f9bf28] shadow-sm shadow-[#f9bf28]" />
              <span>Source File (Language Colored)</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b]" />
              <span>Symbol / Method Satellite</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-3 h-0.5 bg-[#f54e26] inline-block" />
              <span>Flowing Data Packets (Imports & Calls)</span>
            </div>
            <div className="pt-1 text-[10px] text-zinc-500 border-t border-[#282828]">
              Left-Click: Rotate 3D • Right-Click: Pan • Scroll: Zoom
            </div>
          </div>
        </div>
      )}

      {/* Bottom Right 3D Stats HUD (hidden during tour) */}
      {!isTourActive && (
        <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
          <div className="px-3.5 py-2 rounded-full bg-[#141414]/90 border border-[#282828] shadow-xl backdrop-blur-md font-mono text-[11px] text-zinc-400 flex items-center gap-2.5">
            <span className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-[#f54e26]" />
              <span>
                <strong className="text-white">{graphData.nodes.length}</strong> 3D Nodes
              </span>
            </span>
            <span>•</span>
            <span>
              <strong className="text-white">{graphData.links.length}</strong> Edges
            </span>
            <span>•</span>
            <span className="text-[#00a86b]">60 FPS WebGL</span>
          </div>
        </div>
      )}
    </div>
  );
}
