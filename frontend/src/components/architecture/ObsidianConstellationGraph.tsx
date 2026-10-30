"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3-force";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  Maximize2,
  Sparkles,
  X,
  FileCode,
  Folder,
  Code,
} from "lucide-react";
import { ObsidianGraphData, ObsidianNode, ObsidianLink } from "@/lib/types";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Top bar UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ALL");
  const [hoveredNode, setHoveredNode] = useState<ObsidianNode | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);

  // Transform offset for pan & zoom (maintained in ref for 60fps render loop)
  const transformRef = useRef({ x: 0, y: 0, k: 0.85 });
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<any>(null);

  // Camera smooth fly-to animation ref
  const cameraAnimRef = useRef<{
    startX: number;
    startY: number;
    startK: number;
    targetX: number;
    targetY: number;
    targetK: number;
    startTime: number;
    duration: number;
  } | null>(null);

  // Live simulation & data refs (completely decoupled from React state renders)
  const simulationRef = useRef<any>(null);
  const nodesRef = useRef<any[]>([]);
  const linksRef = useRef<any[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Filters & selection refs for immediate access in render loop
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const selectedLanguageRef = useRef(selectedLanguage);
  selectedLanguageRef.current = selectedLanguage;
  const selectedFilePathRef = useRef(selectedFilePath);
  selectedFilePathRef.current = selectedFilePath;
  const hoveredNodeRef = useRef<ObsidianNode | null>(null);
  const handlersRef = useRef({ onSelectNode });
  handlersRef.current = { onSelectNode };

  // Unique languages for filter pills
  const languages = useMemo(() => {
    return Array.from(
      new Set(data.nodes.map((n) => n.language).filter(Boolean) as string[])
    ).sort();
  }, [data.nodes]);

  // Coordinate helper: Canvas client space to World space
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { x, y, k } = transformRef.current;
    return {
      x: (clientX - rect.left - x) / k,
      y: (clientY - rect.top - y) / k,
    };
  }, []);

  // Smoothly fly camera to a target world coordinate
  const flyTo = useCallback((targetWorldX: number, targetWorldY: number, targetZoom = 1.35) => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const current = transformRef.current;
    cameraAnimRef.current = {
      startX: current.x,
      startY: current.y,
      startK: current.k,
      targetX: w / 2 - targetWorldX * targetZoom,
      targetY: h / 2 - targetWorldY * targetZoom,
      targetK: targetZoom,
      startTime: performance.now(),
      duration: 450,
    };
  }, []);

  // Initialize simulation ONCE when data changes
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !data.nodes || data.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Center transform initially
    transformRef.current = { x: width / 2, y: height / 2, k: 0.85 };
    setZoomPercent(85);

    // Deep clone data so D3 mutations don't alter external props
    const validIds = new Set(data.nodes.map((n) => n.id));

    // Sunflower spiral initialization for clean dispersion
    const simNodes = data.nodes.map((d, i) => {
      const phi = i * 2.39996;
      const r = Math.sqrt(i + 1) * 36;
      return {
        ...d,
        x: Math.cos(phi) * r,
        y: Math.sin(phi) * r,
        vx: 0,
        vy: 0,
        size: d.size || (d.type === "directory" ? 24 : d.type === "file" ? 11 : 6),
      };
    });

    const simLinks = data.links
      .filter((l) => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        return validIds.has(s) && validIds.has(t);
      })
      .map((l) => ({
        source: typeof l.source === "object" ? l.source.id : l.source,
        target: typeof l.target === "object" ? l.target.id : l.target,
        type: l.type,
      }));

    nodesRef.current = simNodes;
    linksRef.current = simLinks;

    // Fast node lookup map
    const nodeMap = new Map<string, any>();
    simNodes.forEach((n) => nodeMap.set(n.id, n));

    // D3 Force Simulation setup with non-overlapping physical collision bubbles
    const simulation = d3
      .forceSimulation(simNodes as any)
      .force(
        "link",
        d3
          .forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance((d: any) => {
            if (d.type === "has_symbol") return 22;
            if (d.type === "contains") return 50;
            return 115;
          })
          .strength((d: any) => {
            if (d.type === "has_symbol") return 0.85;
            if (d.type === "contains") return 0.75;
            return 0.16;
          })
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d: any) => {
          if (d.type === "directory") return -320;
          if (d.type === "symbol") return -16;
          return -75;
        })
      )
      // Solid collision cushion to prevent bubbles from overlapping each other!
      .force(
        "collide",
        d3
          .forceCollide()
          .radius((d: any) => {
            if (d.type === "directory") return 36;
            if (d.type === "file") return (d.size || 11) + 14;
            return 9;
          })
          .iterations(3)
      )
      .force("center", d3.forceCenter(0, 0).strength(0.025))
      .force("x", d3.forceX(0).strength(0.015))
      .force("y", d3.forceY(0).strength(0.015))
      .alphaDecay(0.018)
      .alphaMin(0.001);

    // Warm up the simulation statically so bubbles take an organic initial shape
    for (let i = 0; i < 90; ++i) simulation.tick();

    // Maintain a subtle ambient floating motion ("animate the bubbles with real physics")
    simulation.alphaTarget(0.003);
    simulationRef.current = simulation;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 60 FPS Render Loop
    const render = () => {
      // 1. Interpolate camera fly-to if active
      if (cameraAnimRef.current) {
        const anim = cameraAnimRef.current;
        const now = performance.now();
        const progress = Math.min(1, (now - anim.startTime) / anim.duration);
        // EaseInOutCubic
        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        transformRef.current.x = anim.startX + (anim.targetX - anim.startX) * ease;
        transformRef.current.y = anim.startY + (anim.targetY - anim.startY) * ease;
        transformRef.current.k = anim.startK + (anim.targetK - anim.startK) * ease;
        setZoomPercent(Math.round(transformRef.current.k * 100));

        if (progress >= 1) {
          cameraAnimRef.current = null;
        }
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const { x, y, k } = transformRef.current;
      ctx.translate(x, y);
      ctx.scale(k, k);

      // Subtle celestial coordinate grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 1 / k;
      const gridSize = 100;
      const bounds = 3600;
      for (let gx = -bounds; gx <= bounds; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, -bounds);
        ctx.lineTo(gx, bounds);
        ctx.stroke();
      }
      for (let gy = -bounds; gy <= bounds; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-bounds, gy);
        ctx.lineTo(bounds, gy);
        ctx.stroke();
      }

      const activeHover = hoveredNodeRef.current;
      const activeSearch = searchQueryRef.current.trim().toLowerCase();
      const activeLang = selectedLanguageRef.current;
      const activeSelectedPath = selectedFilePathRef.current;

      // Identify connected nodes for hover illumination
      const connectedIds = new Set<string>();
      if (activeHover) {
        connectedIds.add(activeHover.id);
        simLinks.forEach((link: any) => {
          const sId = link.source?.id || link.source;
          const tId = link.target?.id || link.target;
          if (sId === activeHover.id) connectedIds.add(tId);
          if (tId === activeHover.id) connectedIds.add(sId);
        });
      }

      // Draw Links (Constellation lines)
      simLinks.forEach((link: any) => {
        if (!link.source || !link.target) return;
        const s = typeof link.source === "object" ? link.source : nodeMap.get(link.source);
        const t = typeof link.target === "object" ? link.target : nodeMap.get(link.target);
        if (!s || !t) return;

        // Language filter check
        if (activeLang !== "ALL") {
          if (s.type === "file" && s.language && s.language !== activeLang) return;
          if (t.type === "file" && t.language && t.language !== activeLang) return;
        }

        const isHighlighted =
          activeHover && (s.id === activeHover.id || t.id === activeHover.id);

        let strokeColor = "rgba(148, 163, 184, 0.14)";
        let strokeW = 1 / k;

        if (isHighlighted) {
          strokeColor = "#818cf8";
          strokeW = 2.2 / k;
        } else if (activeHover) {
          strokeColor = "rgba(148, 163, 184, 0.03)";
        } else if (link.type === "contains") {
          strokeColor = "rgba(99, 102, 241, 0.18)";
          strokeW = 1 / k;
        } else if (link.type === "has_symbol") {
          strokeColor = "rgba(56, 189, 248, 0.15)";
          strokeW = 0.8 / k;
        } else if (link.type === "imports") {
          strokeColor = "rgba(129, 140, 248, 0.35)";
          strokeW = 1.2 / k;
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeW;
        if (link.type === "contains" && !isHighlighted) {
          ctx.setLineDash([3 / k, 3 / k]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw Nodes (Physical Bubbles & Stars)
      simNodes.forEach((node: any) => {
        // Language filter
        if (activeLang !== "ALL" && node.type === "file" && node.language && node.language !== activeLang) {
          return;
        }

        const isHovered = activeHover?.id === node.id;
        const isConnected = activeHover ? connectedIds.has(node.id) : true;
        const isSelected =
          activeSelectedPath &&
          (node.path === activeSelectedPath || node.id === `file:${activeSelectedPath}`);
        const isSearchMatch =
          Boolean(activeSearch) &&
          (node.name.toLowerCase().includes(activeSearch) ||
            (node.path && node.path.toLowerCase().includes(activeSearch)));

        const opacity = activeHover
          ? isConnected
            ? 1
            : 0.12
          : activeSearch
          ? isSearchMatch
            ? 1
            : 0.18
          : 1;

        ctx.globalAlpha = opacity;

        const baseRadius = node.size || (node.type === "directory" ? 22 : node.type === "file" ? 11 : 6);
        const radius = baseRadius * (isHovered ? 1.25 : 1);

        // A. Directory Hubs (Prominent Orbital Rings & Indigo Cores)
        if (node.type === "directory") {
          // Outer subtle dashed orbital aura
          ctx.strokeStyle = isHovered
            ? "rgba(129, 140, 248, 0.9)"
            : "rgba(99, 102, 241, 0.35)";
          ctx.lineWidth = (isHovered ? 2 : 1.2) / k;
          ctx.setLineDash([4 / k, 4 / k]);
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 7 / k, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Core bubble
          ctx.fillStyle = isHovered ? "#6366f1" : "#4f46e5";
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = (isHovered ? 2.5 : 1.2) / k;
          ctx.stroke();
        }
        // B. File Bubbles & Symbol Dots
        else {
          ctx.fillStyle = isSearchMatch
            ? "#fbbf24"
            : isHovered
            ? "#ffffff"
            : node.color || "#818cf8";
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isHovered || isSelected
            ? "#38bdf8"
            : isSearchMatch
            ? "#f59e0b"
            : "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = (isHovered || isSelected ? 2.5 : 0.8) / k;
          ctx.stroke();
        }

        // C. Clean, Non-Clumsy Level of Detail (LOD) Labels
        // Solves the overlapping text issue:
        // - Directories always show clean names.
        // - When zoomed out, files do NOT show labels to prevent clumsy clutter.
        // - On Hover / Selection / Search, labels reveal with a crisp dark pill backing!
        // - When zoomed in (k > 1.25), file labels fade in cleanly.
        const showLabel =
          node.type === "directory" ||
          isHovered ||
          isSelected ||
          isSearchMatch ||
          (k > 1.25 && node.type === "file");

        if (showLabel) {
          const fontSize = node.type === "directory" ? 11 : 10;
          ctx.font = `${node.type === "directory" ? "600 " : ""}${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;

          // Truncate non-hovered labels to prevent horizontal crowding
          let displayName = node.name;
          if (!isHovered && !isSelected && node.type === "file" && displayName.length > 18) {
            displayName = displayName.slice(0, 16) + "…";
          }

          const textMetrics = ctx.measureText(displayName);
          const textW = textMetrics.width;
          const textH = fontSize;
          const pillPadX = 5 / k;
          const pillPadY = 2 / k;
          const pillX = node.x - textW / 2 - pillPadX;
          const pillY = node.y + radius + 4 / k;

          // Crisp rounded dark pill backing behind text to eliminate collision mess
          ctx.fillStyle = "rgba(9, 13, 22, 0.88)";
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(pillX, pillY, textW + pillPadX * 2, textH + pillPadY * 2 + 2 / k, 3 / k);
          } else {
            ctx.rect(pillX, pillY, textW + pillPadX * 2, textH + pillPadY * 2 + 2 / k);
          }
          ctx.fill();

          ctx.strokeStyle = isHovered || isSelected
            ? "rgba(56, 189, 248, 0.6)"
            : isSearchMatch
            ? "rgba(251, 191, 36, 0.6)"
            : "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1 / k;
          ctx.stroke();

          // Label text
          ctx.fillStyle = isHovered || isSelected
            ? "#ffffff"
            : isSearchMatch
            ? "#fbbf24"
            : "rgba(226, 232, 240, 0.9)";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(displayName, node.x, pillY + pillPadY + 1 / k);
        }

        ctx.globalAlpha = 1;
      });

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    // Responsive Canvas Resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      simulation.stop();
      window.removeEventListener("resize", handleResize);
    };
  }, [data, flyTo]);

  // Pointer Interaction Handlers (Hover, Drag, Pan, Zoom)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);

    // Check if clicking a bubble to drag
    let clickedNode: any = null;
    for (const node of nodesRef.current) {
      const dist = Math.hypot(node.x - worldPos.x, node.y - worldPos.y);
      if (dist <= (node.size || 12) + 6) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
      // Awaken the physics with elastic spring momentum!
      simulationRef.current?.alphaTarget(0.25).restart();
    } else {
      isDraggingCanvasRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 1. Dragging a physical bubble
    if (draggedNodeRef.current) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      draggedNodeRef.current.fx = worldPos.x;
      draggedNodeRef.current.fy = worldPos.y;
      return;
    }

    // 2. Panning the camera canvas
    if (isDraggingCanvasRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 3. Hover detection (fast radius check without restarting physics!)
    const worldPos = screenToWorld(e.clientX, e.clientY);
    let found: ObsidianNode | null = null;
    for (const node of nodesRef.current) {
      const dist = Math.hypot(node.x - worldPos.x, node.y - worldPos.y);
      if (dist <= (node.size || 12) + 6) {
        found = node;
        break;
      }
    }

    hoveredNodeRef.current = found;
    setHoveredNode(found);
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      draggedNodeRef.current = null;
      // Allow the bubble to gently oscillate and settle into place
      simulationRef.current?.alphaTarget(0.003);
    }
    isDraggingCanvasRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    for (const node of nodesRef.current) {
      const dist = Math.hypot(node.x - worldPos.x, node.y - worldPos.y);
      if (dist <= (node.size || 12) + 6) {
        handlersRef.current.onSelectNode(node);
        break;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.09 : 0.91;
    const currentK = transformRef.current.k;
    const newK = Math.min(3.5, Math.max(0.12, currentK * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newK / currentK);
    transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newK / currentK);
    transformRef.current.k = newK;

    setZoomPercent(Math.round(newK * 100));
  };

  // Search Enter key flies directly to match
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const match = nodesRef.current.find(
        (n) => n.name.toLowerCase().includes(q) || (n.path && n.path.toLowerCase().includes(q))
      );
      if (match) {
        flyTo(match.x, match.y, 1.4);
        handlersRef.current.onSelectNode(match);
      }
    }
  };

  // Zoom control buttons
  const handleZoomIn = () => {
    const container = containerRef.current;
    if (!container) return;
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const currentK = transformRef.current.k;
    const newK = Math.min(3.5, currentK * 1.25);

    transformRef.current.x = centerX - (centerX - transformRef.current.x) * (newK / currentK);
    transformRef.current.y = centerY - (centerY - transformRef.current.y) * (newK / currentK);
    transformRef.current.k = newK;
    setZoomPercent(Math.round(newK * 100));
  };

  const handleZoomOut = () => {
    const container = containerRef.current;
    if (!container) return;
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const currentK = transformRef.current.k;
    const newK = Math.max(0.12, currentK / 1.25);

    transformRef.current.x = centerX - (centerX - transformRef.current.x) * (newK / currentK);
    transformRef.current.y = centerY - (centerY - transformRef.current.y) * (newK / currentK);
    transformRef.current.k = newK;
    setZoomPercent(Math.round(newK * 100));
  };

  const handleResetZoom = () => {
    const container = containerRef.current;
    if (!container) return;
    flyTo(0, 0, 0.85);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#090d16] overflow-hidden select-none"
    >
      {/* Background Subtle Radial Gradient Starfield Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/25 via-[#090d16]/70 to-[#040711]" />

      {/* Physics Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing relative z-10"
      />

      {/* Top Floating Controls & Search Bar */}
      <div className="absolute top-3.5 left-4 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-2rem)]">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search constellation (Press Enter to jump)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-8 pr-7 py-1.5 w-64 md:w-80 rounded-xl bg-slate-900/95 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 font-mono backdrop-blur-md shadow-2xl transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-200"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Language Filter */}
        <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-900/95 border border-slate-800 backdrop-blur-md text-xs font-mono shadow-2xl">
          <Filter className="w-3 h-3 text-slate-400 mr-1" />
          <button
            onClick={() => setSelectedLanguage("ALL")}
            className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors ${
              selectedLanguage === "ALL"
                ? "bg-indigo-600 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All
          </button>
          {languages.slice(0, 4).map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors ${
                selectedLanguage === lang
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Zoom & Fit Toolbar */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-900/95 border border-slate-800 backdrop-blur-md shadow-2xl">
          <button
            onClick={handleZoomIn}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <div className="h-3 w-[1px] bg-slate-800 mx-0.5" />
          <button
            onClick={handleResetZoom}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Reset View"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-slate-500 px-1.5 select-none">
            {zoomPercent}%
          </span>
        </div>
      </div>

      {/* Floating Hover Inspector Pill (Top Right) */}
      {hoveredNode && (
        <div className="absolute top-3.5 right-4 z-20 max-w-sm p-3 rounded-xl bg-slate-950/95 border border-indigo-500/40 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 font-mono text-xs pointer-events-none">
          <div className="flex items-center space-x-2 text-indigo-300 font-semibold truncate mb-1">
            {hoveredNode.type === "directory" ? (
              <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : hoveredNode.type === "file" ? (
              <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            ) : (
              <Code className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{hoveredNode.name}</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mb-1.5">
            {hoveredNode.path}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-300">
            {hoveredNode.language && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800/50 text-indigo-300">
                {hoveredNode.language}
              </span>
            )}
            {hoveredNode.fileCount !== undefined && (
              <span>{hoveredNode.fileCount} files</span>
            )}
            {hoveredNode.lineCount !== undefined && (
              <span>{hoveredNode.lineCount} lines</span>
            )}
            {hoveredNode.functionCount !== undefined && (
              <span>{hoveredNode.functionCount} functions</span>
            )}
          </div>
        </div>
      )}

      {/* Bottom Left Celestial Legend */}
      <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-slate-900/95 border border-slate-800 backdrop-blur-md text-xs space-y-2 shadow-2xl font-mono hidden md:block">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between gap-4">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Obsidian Cosmos Network</span>
          </div>
          <span className="text-[9px] text-slate-500">
            {data.stats?.total_nodes || data.nodes.length} stars
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600 border border-indigo-400"></span>
            <span className="text-slate-300">Directory Hub</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span className="text-slate-300">File Node (Language-colored)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Symbol (Function / Class)</span>
          </div>
        </div>
        <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-[1px] border-t border-dashed border-indigo-400/80" />
            <span>Containment</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-[1px] bg-indigo-400" />
            <span>Imports / Calls</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-[1px] bg-sky-400" />
            <span>Declared Symbols</span>
          </div>
        </div>
      </div>
    </div>
  );
}
