"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3-force";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Search, 
  Filter, 
  Sparkles, 
  Folder, 
  FileCode, 
  Code,
  Maximize2
} from "lucide-react";
import { ObsidianGraphData, ObsidianNode, ObsidianLink } from "@/lib/types";

interface ObsidianGraphProps {
  data: ObsidianGraphData;
  onSelectNode: (node: ObsidianNode) => void;
}

export default function ObsidianConstellationGraph({ data, onSelectNode }: ObsidianGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ALL");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<ObsidianNode | null>(null);

  // Transform offset for pan & zoom
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<any>(null);

  // Simulation ref
  const simulationRef = useRef<any>(null);
  const nodesRef = useRef<any[]>([]);
  const linksRef = useRef<any[]>([]);

  // Unique languages for filter
  const languages = Array.from(
    new Set(data.nodes.map((n) => n.language).filter(Boolean) as string[])
  );

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

    // Center transform initially
    transformRef.current = { x: width / 2, y: height / 2, k: 0.85 };

    // Clone data for simulation
    const simNodes = data.nodes.map((d) => ({ ...d }));
    const simLinks = data.links.map((d) => ({ ...d }));
    nodesRef.current = simNodes;
    linksRef.current = simLinks;

    // D3 Force Simulation setup
    const simulation = d3.forceSimulation(simNodes as any)
      .force(
        "link",
        d3.forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance((d: any) => (d.type === "contains" ? 50 : 80))
          .strength((d: any) => (d.type === "contains" ? 0.6 : 0.3))
      )
      .force("charge", d3.forceManyBody().strength((d: any) => (d.type === "directory" ? -280 : -90)))
      .force("collide", d3.forceCollide().radius((d: any) => (d.size || 10) + 8))
      .force("center", d3.forceCenter(0, 0))
      .alphaDecay(0.02);

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

      // 1. Draw subtle background coordinate grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1 / k;
      const gridSize = 100;
      const bounds = 3000;
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

      // Pre-compute connected nodes set for hover highlighting (Obsidian focus effect)
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

      // 2. Draw Links (import & containment edges)
      simLinks.forEach((link: any) => {
        if (!link.source || !link.target) return;
        const s = link.source;
        const t = link.target;

        const isConnected = hoveredNode 
          ? (s.id === hoveredNode.id || t.id === hoveredNode.id)
          : false;

        const alpha = hoveredNode 
          ? (isConnected ? 0.8 : 0.08) 
          : (link.type === "contains" ? 0.15 : 0.3);

        ctx.strokeStyle = isConnected 
          ? "rgba(139, 92, 246, 0.9)" 
          : link.type === "contains" 
            ? `rgba(99, 102, 241, ${alpha})` 
            : `rgba(148, 163, 184, ${alpha})`;

        ctx.lineWidth = isConnected ? 2.5 / k : (link.type === "contains" ? 1 / k : 1.5 / k);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      });

      // 3. Draw Nodes (Constellation dots)
      simNodes.forEach((node: any) => {
        const isHovered = hoveredNode?.id === node.id;
        const isConnected = hoveredNode ? connectedNodeIds.has(node.id) : true;
        const isSearchMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());

        // Opacity dimming if hover focus is active
        const opacity = hoveredNode ? (isConnected ? 1 : 0.15) : 1;
        ctx.globalAlpha = opacity;

        const radius = (node.size || 10) * (isHovered ? 1.3 : 1);

        // A. Directory Hub glowing aura
        if (node.type === "directory") {
          const gradient = ctx.createRadialGradient(node.x, node.y, radius * 0.4, node.x, node.y, radius * 2);
          gradient.addColorStop(0, "rgba(139, 92, 246, 0.5)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // B. Node Core Dot
        ctx.fillStyle = isSearchMatch ? "#fbbf24" : node.color || "#818cf8";
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // C. Border Ring
        ctx.strokeStyle = isHovered 
          ? "#ffffff" 
          : isSearchMatch 
            ? "#f59e0b" 
            : "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = (isHovered ? 2.5 : 1) / k;
        ctx.stroke();

        // D. Labels (Dynamic Level of Detail)
        const showLabel = 
          node.type === "directory" || 
          isHovered || 
          isSearchMatch || 
          (k > 0.8 && node.type === "file" && (node.inDegree || 0) > 1);

        if (showLabel) {
          ctx.font = `${node.type === "directory" ? "bold 12px" : "10px"} -apple-system, sans-serif`;
          ctx.fillStyle = isHovered ? "#ffffff" : "rgba(226, 232, 240, 0.9)";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(node.name, node.x, node.y + radius + 3 / k);
        }

        ctx.globalAlpha = 1;
      });

      ctx.restore();
    };

    simulation.on("tick", render);

    // Resize handler
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
  }, [data, hoveredNode, searchQuery]);

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
        // Dragging a specific node
        const pos = getCanvasMousePos(e);
        draggedNodeRef.current.fx = pos.x;
        draggedNodeRef.current.fy = pos.y;
        simulationRef.current?.alphaTarget(0.3).restart();
      } else {
        // Panning the canvas
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
      if (dist <= (node.size || 10) + 4) {
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
      if (dist <= (node.size || 10) + 4) {
        draggedNodeRef.current = node;
        node.fx = node.x;
        node.fy = node.y;
        break;
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      if (dist <= (node.size || 10) + 4) {
        onSelectNode(node);
        break;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newK = Math.min(3, Math.max(0.2, transformRef.current.k * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newK / transformRef.current.k);
    transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newK / transformRef.current.k);
    transformRef.current.k = newK;
    setZoomLevel(newK);
  };

  const handleResetZoom = () => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    transformRef.current = { x: w / 2, y: h / 2, k: 0.85 };
    setZoomLevel(0.85);
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
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search files or modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-64 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 backdrop-blur-md shadow-xl"
          />
        </div>

        {/* Language Filter */}
        <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 backdrop-blur-md text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <button
            onClick={() => setSelectedLanguage("ALL")}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
              selectedLanguage === "ALL" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All
          </button>
          {languages.slice(0, 4).map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                selectedLanguage === lang ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Left Legend */}
      <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-slate-900/85 border border-white/10 backdrop-blur-md text-xs space-y-2 shadow-2xl">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Obsidian Cosmos Legend</span>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 rounded-full bg-violet-600/80 border border-violet-400 shadow-sm shadow-violet-500"></span>
            <span className="text-slate-300 font-medium">Directory Hub (Large Dot)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-300"></span>
            <span className="text-slate-300">Source File (Size = In/Out Links)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-slate-400">Satellite Symbol (Function/Class)</span>
          </div>
        </div>
      </div>

      {/* Bottom Right Zoom / Pan Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center space-x-1 p-1 rounded-xl bg-slate-900/90 border border-white/10 backdrop-blur-md shadow-xl">
        <button
          onClick={() => {
            transformRef.current.k = Math.min(3, transformRef.current.k * 1.2);
            setZoomLevel(transformRef.current.k);
          }}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            transformRef.current.k = Math.max(0.2, transformRef.current.k * 0.8);
            setZoomLevel(transformRef.current.k);
          }}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Hover Info Tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 z-20 p-3 rounded-xl bg-[#0f172a]/95 border border-white/10 backdrop-blur-md shadow-2xl max-w-xs text-xs space-y-1 animate-in fade-in duration-100 pointer-events-none">
          <div className="font-semibold text-slate-100 flex items-center space-x-1.5">
            {hoveredNode.type === "directory" ? (
              <Folder className="w-3.5 h-3.5 text-violet-400" />
            ) : hoveredNode.type === "file" ? (
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Code className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="truncate">{hoveredNode.name}</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">{hoveredNode.path}</div>
          {hoveredNode.type === "file" && (
            <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
              <span>{hoveredNode.language}</span>
              <span>{hoveredNode.inDegree || 0} in • {hoveredNode.outDegree || 0} out</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
