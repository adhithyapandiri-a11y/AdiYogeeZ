"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3-force";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Search, 
  Filter, 
  Folder, 
  FileCode, 
  Code,
  Maximize2,
  Sparkles,
  Layers,
  ArrowDownLeft,
  ArrowUpRight
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
  selectedFilePath
}: ObsidianGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ALL");
  const [hoveredNode, setHoveredNode] = useState<ObsidianNode | null>(null);

  // Transform offset for pan & zoom
  const transformRef = useRef({ x: 0, y: 0, k: 0.85 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<any>(null);

  // Simulation ref
  const simulationRef = useRef<any>(null);
  const nodesRef = useRef<any[]>([]);
  const linksRef = useRef<any[]>([]);

  // Unique languages for filter
  const languages = useMemo(() => {
    return Array.from(
      new Set(data.nodes.map((n) => n.language).filter(Boolean) as string[])
    );
  }, [data.nodes]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    transformRef.current = { x: width / 2, y: height / 2, k: 0.85 };

    // Clone data for simulation
    const simNodes = data.nodes.map((d) => ({ ...d }));
    const simLinks = data.links.map((d) => ({ ...d }));
    nodesRef.current = simNodes;
    linksRef.current = simLinks;

    // D3 Force Simulation setup with balanced astronomical clustering
    const simulation = d3.forceSimulation(simNodes as any)
      .force(
        "link",
        d3.forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance((d: any) => {
            if (d.type === "has_symbol") return 24;
            if (d.type === "contains") return 48;
            return 110;
          })
          .strength((d: any) => {
            if (d.type === "has_symbol") return 0.9;
            if (d.type === "contains") return 0.8;
            return 0.12;
          })
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d: any) => {
          if (d.type === "directory") return -220;
          if (d.type === "symbol") return -12;
          return -45;
        })
      )
      .force(
        "collide",
        d3.forceCollide().radius((d: any) => (d.size || 8) + 5)
      )
      .force("center", d3.forceCenter(0, 0).strength(0.04))
      .alphaDecay(0.025);

    simulationRef.current = simulation;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render loop
    const render = () => {
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const { x, y, k } = transformRef.current;
      ctx.translate(x, y);
      ctx.scale(k, k);

      // 1. Subtle Dark Coordinate Grid (Professional, non-intrusive)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1 / k;
      const gridSize = 120;
      const bounds = 3200;
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

      // Pre-compute connected nodes set for hover highlighting
      const connectedNodeIds = new Set<string>();
      if (hoveredNode) {
        connectedNodeIds.add(hoveredNode.id);
        simLinks.forEach((link: any) => {
          const sId = link.source?.id || link.source;
          const tId = link.target?.id || link.target;
          if (sId === hoveredNode.id) connectedNodeIds.add(tId);
          if (tId === hoveredNode.id) connectedNodeIds.add(sId);
        });
      }

      // 2. Draw Links (Containment, Imports, Satellite Calls)
      simLinks.forEach((link: any) => {
        if (!link.source || !link.target) return;
        const s = link.source;
        const t = link.target;

        const isConnected = hoveredNode 
          ? (s.id === hoveredNode.id || t.id === hoveredNode.id)
          : false;

        let strokeColor = "rgba(148, 163, 184, 0.18)";
        let strokeW = 1 / k;

        if (isConnected) {
          strokeColor = "rgba(129, 140, 248, 0.85)";
          strokeW = 2 / k;
        } else if (hoveredNode) {
          strokeColor = "rgba(148, 163, 184, 0.04)";
        } else if (link.type === "contains") {
          strokeColor = "rgba(99, 102, 241, 0.12)";
          strokeW = 1 / k;
        } else if (link.type === "has_symbol") {
          strokeColor = "rgba(56, 189, 248, 0.12)";
          strokeW = 0.8 / k;
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeW;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      });

      // 3. Draw Nodes (Constellation dots)
      simNodes.forEach((node: any) => {
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedFilePath && (node.path === selectedFilePath || node.id === `file:${selectedFilePath}`);
        const isConnected = hoveredNode ? connectedNodeIds.has(node.id) : true;
        const isSearchMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());

        // Language filter check
        if (selectedLanguage !== "ALL" && node.type === "file" && node.language !== selectedLanguage) {
          return;
        }

        // Opacity dimming on focus
        const opacity = hoveredNode ? (isConnected ? 1 : 0.12) : 1;
        ctx.globalAlpha = opacity;

        const radius = (node.size || 8) * (isHovered ? 1.25 : 1);

        // A. Directory Hubs (Concentric subtle rings - No harsh neon)
        if (node.type === "directory") {
          // Outer subtle orbital ring
          ctx.strokeStyle = isHovered ? "rgba(129, 140, 248, 0.6)" : "rgba(99, 102, 241, 0.2)";
          ctx.lineWidth = 1 / k;
          ctx.setLineDash([3 / k, 3 / k]);
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Core dot
          ctx.fillStyle = isHovered ? "#6366f1" : "#4f46e5";
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.35)";
          ctx.lineWidth = (isHovered ? 2 : 1) / k;
          ctx.stroke();
        } 
        // B. File Nodes & Symbols
        else {
          ctx.fillStyle = isSearchMatch ? "#fbbf24" : node.color || "#818cf8";
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isHovered || isSelected
            ? "#ffffff" 
            : isSearchMatch 
              ? "#f59e0b" 
              : "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = (isHovered || isSelected ? 2 : 0.8) / k;
          ctx.stroke();
        }

        // C. Clean Typography Labels (Level of Detail)
        const showLabel = 
          node.type === "directory" || 
          isHovered || 
          isSelected ||
          isSearchMatch || 
          (k > 0.85 && node.type === "file" && (node.inDegree || 0) > 0);

        if (showLabel) {
          ctx.font = `${node.type === "directory" ? "600 11px" : "10px"} ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
          ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "rgba(226, 232, 240, 0.85)";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(node.name, node.x, node.y + radius + 4 / k);
        }

        ctx.globalAlpha = 1;
      });

      ctx.restore();
    };

    simulation.on("tick", render);

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      render();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      simulation.stop();
      window.removeEventListener("resize", handleResize);
    };
  }, [data, hoveredNode, searchQuery, selectedLanguage, selectedFilePath]);

  // Mouse interaction: Hover, Drag, Zoom, Pan
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { x, y, k } = transformRef.current;
    return {
      x: (e.clientX - rect.left - x) / k,
      y: (e.clientY - rect.top - y) / k
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      if (draggedNodeRef.current) {
        const pos = getCanvasMousePos(e);
        draggedNodeRef.current.fx = pos.x;
        draggedNodeRef.current.fy = pos.y;
        simulationRef.current?.alphaTarget(0.3).restart();
      } else {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        transformRef.current.x += dx;
        transformRef.current.y += dy;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }

    // Hover detection
    const pos = getCanvasMousePos(e);
    let found: any = null;
    for (const node of nodesRef.current) {
      const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
      if (dist <= (node.size || 8) + 4) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    const pos = getCanvasMousePos(e);
    for (const node of nodesRef.current) {
      const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
      if (dist <= (node.size || 8) + 4) {
        draggedNodeRef.current = node;
        node.fx = node.x;
        node.fy = node.y;
        break;
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      draggedNodeRef.current = null;
      simulationRef.current?.alphaTarget(0);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    for (const node of nodesRef.current) {
      const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
      if (dist <= (node.size || 8) + 4) {
        onSelectNode(node);
        break;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newK = Math.min(3.2, Math.max(0.18, transformRef.current.k * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newK / transformRef.current.k);
    transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newK / transformRef.current.k);
    transformRef.current.k = newK;
  };

  const handleResetZoom = () => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    transformRef.current = { x: w / 2, y: h / 2, k: 0.85 };
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#090d16] overflow-hidden select-none">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating Top Controls & Search Bar */}
      <div className="absolute top-3.5 left-4 z-20 flex items-center space-x-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search constellation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-60 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 font-mono backdrop-blur-md shadow-xl transition-all"
          />
        </div>

        {/* Language Filter */}
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs font-mono">
          <Filter className="w-3 h-3 text-slate-500 mr-1" />
          <button
            onClick={() => setSelectedLanguage("ALL")}
            className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors ${
              selectedLanguage === "ALL" ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All
          </button>
          {languages.slice(0, 4).map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors ${
                selectedLanguage === lang ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Left Legend */}
      <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs space-y-2 shadow-2xl font-mono">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Obsidian Cosmos Network</span>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 border border-indigo-400"></span>
            <span className="text-slate-300">Directory Hub (Major folder)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-slate-300">Source File (Sized by links)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span className="text-slate-400">Function Satellite</span>
          </div>
        </div>
      </div>

      {/* Bottom Right Zoom / Pan Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center space-x-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl">
        <button
          onClick={() => {
            transformRef.current.k = Math.min(3.2, transformRef.current.k * 1.2);
          }}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            transformRef.current.k = Math.max(0.18, transformRef.current.k * 0.8);
          }}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hover Info Tooltip (Clean, non-neon glass card) */}
      {hoveredNode && (
        <div className="absolute top-3.5 right-4 z-20 p-3 rounded-xl bg-slate-900/95 border border-slate-800 backdrop-blur-xl shadow-2xl max-w-xs text-xs space-y-1.5 animate-in fade-in duration-100 pointer-events-none font-mono">
          <div className="font-semibold text-slate-100 flex items-center space-x-1.5">
            {hoveredNode.type === "directory" ? (
              <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : hoveredNode.type === "file" ? (
              <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Code className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            )}
            <span className="truncate">{hoveredNode.name}</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">{hoveredNode.path}</div>
          {hoveredNode.type === "file" && (
            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{hoveredNode.language}</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5 text-emerald-400">
                  <ArrowDownLeft className="w-3 h-3" /> {hoveredNode.inDegree || 0}
                </span>
                <span className="flex items-center gap-0.5 text-indigo-400">
                  <ArrowUpRight className="w-3 h-3" /> {hoveredNode.outDegree || 0}
                </span>
              </div>
            </div>
          )}
          {hoveredNode.type === "directory" && (
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <span>{hoveredNode.fileCount || 0} contained files</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
