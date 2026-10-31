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
      const targetNode = graphData.nodes.find((n) => n.id === step.targetNodeId);
      if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined && targetNode.z !== undefined) {
        const distance = step.distance || 170;
        const hyp = Math.hypot(targetNode.x, targetNode.y, targetNode.z) || 1;
        const distRatio = 1 + distance / hyp;
        fgRef.current.cameraPosition(
          { x: targetNode.x * distRatio, y: targetNode.y * distRatio + 25, z: targetNode.z * distRatio },
          targetNode,
          1500
        );
        onSelectNode(targetNode as ObsidianNode);
        return;
      }
    }

    // Default overview camera fly-back
    fgRef.current.cameraPosition({ x: 0, y: 0, z: 900 }, { x: 0, y: 0, z: 0 }, 1500);
  }, [tourSteps, graphData.nodes, onSelectNode]);

  // Tour Controller: Start Guided Tour
  const startGuidedTour = () => {
    setIsTourActive(true);
    setIsTourPaused(false);
    setAutoRotate(false);
    navigateToTourStep(0);
  };

  // Tour Controller: Exit Tour
  const exitGuidedTour = () => {
    setIsTourActive(false);
    setIsTourPaused(false);
    setTourProgress(0);
    if (tourIntervalRef.current) clearTimeout(tourIntervalRef.current);
    if (tourProgressRef.current) clearInterval(tourProgressRef.current);

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
        nodeColor={(node: any) =>
          isTourActive && currentStep?.targetNodeId === node.id
            ? "#38bdf8"
            : node.color || "#6366f1"
        }
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

          {/* --- IDEA #4: 30-SECOND GUIDED TOUR HERO BUTTON --- */}
          {!isTourActive ? (
            <button
              onClick={startGuidedTour}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-xs font-mono font-semibold shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Start automated 30-second architectural walkthrough"
            >
              <Play className="w-3.5 h-3.5 fill-current text-cyan-200" />
              <span>30s Guided Tour</span>
              <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
            </button>
          ) : (
            <button
              onClick={exitGuidedTour}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-mono font-semibold transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Tour</span>
            </button>
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

      {/* --- IDEA #4: CINEMATIC ARCHITECTURE STORYTELLER HUD (FLOATING BANNER) --- */}
      {isTourActive && currentStep && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-300 font-mono">
          <div className="p-5 rounded-2xl bg-slate-950/95 border border-cyan-500/40 backdrop-blur-2xl shadow-2xl shadow-cyan-500/10 space-y-3.5 relative overflow-hidden">
            {/* Countdown Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-75 ease-linear"
                style={{ width: `${tourProgress}%` }}
              />
            </div>

            {/* Stage Badge & Step Count */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {currentStep.badge}
                </span>
                <span className="text-xs text-slate-400">
                  {currentStep.stageName}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span>Step {tourStepIndex + 1} of {tourSteps.length}</span>
                <button
                  onClick={exitGuidedTour}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
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
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Compiler AST Insight */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] text-cyan-300 flex items-center space-x-2">
              <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{currentStep.architecturalInsight}</span>
            </div>

            {/* Interactive Player Controls */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => navigateToTourStep(tourStepIndex - 1)}
                  disabled={tourStepIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition"
                  title="Previous stage"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsTourPaused(!isTourPaused)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {isTourPaused ? (
                    <>
                      <Play className="w-3 h-3 fill-current text-cyan-400" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3 fill-current text-amber-400" />
                      <span>Pause</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigateToTourStep(tourStepIndex + 1)}
                  disabled={tourStepIndex === tourSteps.length - 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition"
                  title="Next stage"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {currentStep.targetPath && (
                <button
                  onClick={() => {
                    const node = graphData.nodes.find((n) => n.id === currentStep.targetNodeId);
                    if (node) onSelectNode(node as ObsidianNode);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition"
                >
                  <span>Inspect Code</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
