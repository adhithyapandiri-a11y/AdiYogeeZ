"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
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
  Maximize2,
  Layers,
  Activity,
  Flame,
  CheckCircle2,
  XCircle,
  Eye,
  GitCommit
} from "lucide-react";
import { ObsidianGraphData, ObsidianNode, ObsidianLink, RootFolderSummary } from "@/lib/types";

interface CommitFileItem {
  filename: string;
  status: string;
  additions?: number;
  deletions?: number;
}

interface ObsidianGraphProps {
  data: ObsidianGraphData;
  onSelectNode?: (node: ObsidianNode) => void;
  commitFiles?: CommitFileItem[];
  selectedCommitSha?: string | null;
  className?: string;
  isTimeMachineMode?: boolean;
}

export default function ObsidianConstellationGraph({ 
  data, 
  onSelectNode,
  commitFiles = [],
  selectedCommitSha,
  className = "",
  isTimeMachineMode = false
}: ObsidianGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDepth, setSelectedDepth] = useState<number | "all">("all");
  const [hoveredNode, setHoveredNode] = useState<ObsidianNode | null>(null);
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  // Transform offset for pan & zoom
  const transformRef = useRef({ x: 0, y: 0, k: 0.85 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<any>(null);

  // Simulation & Animation refs
  const simulationRef = useRef<any>(null);
  const nodesRef = useRef<any[]>([]);
  const linksRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const tickCountRef = useRef(0);

  // Map of commit files for O(1) lookup
  const commitFileMap = useMemo(() => {
    const map = new Map<string, CommitFileItem>();
    commitFiles.forEach((cf) => {
      // Normalize path (handle leading slashes or relative)
      const cleanPath = cf.filename.replace(/^\/+/, "");
      map.set(cleanPath, cf);
      map.set(cf.filename, cf);
    });
    return map;
  }, [commitFiles]);

  // Root folders summary for legend
  const rootFolders: RootFolderSummary[] = useMemo(() => {
    if (data.root_folders && data.root_folders.length > 0) {
      return data.root_folders;
    }
    // Fallback compute from nodes
    const map = new Map<string, { color: string; count: number }>();
    data.nodes.forEach((n) => {
      if (n.rootFolder && n.rootFolder !== "Core") {
        const cur = map.get(n.rootFolder) || { color: n.baseColor || n.color, count: 0 };
        cur.count++;
        map.set(n.rootFolder, cur);
      }
    });
    return Array.from(map.entries()).map(([name, val]) => ({
      name,
      color: val.color,
      file_count: val.count
    }));
  }, [data]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Center initial transform
    transformRef.current = { x: width / 2, y: height / 2, k: 0.82 };

    // Clone data for simulation
    const simNodes = data.nodes.map((d) => ({ ...d }));
    const simLinks = data.links.map((d) => ({ ...d }));
    nodesRef.current = simNodes;
    linksRef.current = simLinks;

    // Build fast lookup for nodes by id
    const nodeById = new Map<string, any>();
    simNodes.forEach((n) => nodeById.set(n.id, n));

    // Force Simulation tuned for neural network / synaptic orbital branching
    const simulation = d3.forceSimulation(simNodes as any)
      .force(
        "link",
        d3.forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance((d: any) => (d.type === "contains" ? 55 : 95))
          .strength((d: any) => (d.type === "contains" ? 0.7 : 0.25))
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d: any) => {
          if (d.type === "directory") return d.depth === 0 ? -450 : -220;
          return -80;
        })
      )
      .force("collide", d3.forceCollide().radius((d: any) => (d.size || 10) + 12))
      .force("center", d3.forceCenter(0, 0))
      .alphaDecay(0.025);

    simulationRef.current = simulation;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render loop
    const render = () => {
      tickCountRef.current++;
      const time = tickCountRef.current * 0.03;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const { x, y, k } = transformRef.current;
      ctx.translate(x, y);
      ctx.scale(k, k);

      // 1. Draw subtle Neural Coordinate Grid & Center Radial Aura
      const bounds = 2400;
      ctx.strokeStyle = "rgba(99, 102, 241, 0.035)";
      ctx.lineWidth = 1 / k;
      const gridSize = 120;
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

      // Pre-compute connected nodes set for hover / branch focus
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

      // Check if any commit file is active in Time Machine mode
      const hasCommitFocus = isTimeMachineMode && commitFileMap.size > 0;

      // 2. DRAW SYNAPTIC LINKS
      simLinks.forEach((link: any, idx: number) => {
        if (!link.source || !link.target) return;
        const s = link.source;
        const t = link.target;

        const isHoverConnected = hoveredNode 
          ? (s.id === hoveredNode.id || t.id === hoveredNode.id)
          : false;

        const isBranchMatch = selectedBranch
          ? (s.rootFolder === selectedBranch || t.rootFolder === selectedBranch)
          : true;

        // Check if either end connects to a commit touched file
        const sCommit = commitFileMap.has(s.path);
        const tCommit = commitFileMap.has(t.path);
        const isCommitPathway = hasCommitFocus && (sCommit || tCommit);

        // Alpha calculation
        let alpha = 0.22;
        let lineWidth = (link.type === "contains" ? 1.2 : 1.6) / k;

        if (hoveredNode) {
          alpha = isHoverConnected ? 0.95 : 0.05;
          if (isHoverConnected) lineWidth = 2.4 / k;
        } else if (hasCommitFocus) {
          alpha = isCommitPathway ? 0.9 : 0.08;
          if (isCommitPathway) lineWidth = 2.2 / k;
        } else if (selectedBranch) {
          alpha = isBranchMatch ? 0.6 : 0.06;
        }

        // Color gradient or branch tint
        if (isCommitPathway) {
          ctx.strokeStyle = "rgba(245, 158, 11, 0.9)";
        } else if (isHoverConnected) {
          ctx.strokeStyle = link.branchColor || "rgba(139, 92, 246, 0.9)";
        } else if (link.type === "contains") {
          ctx.strokeStyle = link.color 
            ? `${link.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
            : `rgba(129, 140, 248, ${alpha})`;
        } else {
          // Cross-file import synapse
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        }

        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();

        // 3. SYNAPSE ELECTRICAL PARTICLES (Traveling along the wire)
        if (particlesEnabled && (isCommitPathway || isHoverConnected || (link.type !== "contains" && k > 0.6))) {
          const tProgress = ((time + idx * 0.17) % 1);
          const px = s.x + (t.x - s.x) * tProgress;
          const py = s.y + (t.y - s.y) * tProgress;

          ctx.fillStyle = isCommitPathway 
            ? "#fbbf24" 
            : link.branchColor || "#38bdf8";
          ctx.beginPath();
          ctx.arc(px, py, (isCommitPathway ? 2.5 : 1.8) / k, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. DRAW NODES (Neural Nuclei & Synaptic Terminals)
      simNodes.forEach((node: any) => {
        const isHovered = hoveredNode?.id === node.id;
        const isConnected = hoveredNode ? connectedNodeIds.has(node.id) : true;
        const isBranchMatch = selectedBranch ? node.rootFolder === selectedBranch : true;

        const isSearchMatch = searchQuery && (
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (node.path && node.path.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        // Check if node is part of the commit diff
        const commitInfo = node.path ? commitFileMap.get(node.path) : undefined;
        const isCommitModified = Boolean(commitInfo);

        // Opacity dimming rules
        let opacity = 1.0;
        if (hoveredNode) {
          opacity = isConnected ? 1.0 : 0.12;
        } else if (hasCommitFocus) {
          opacity = isCommitModified ? 1.0 : 0.18;
        } else if (selectedBranch) {
          opacity = isBranchMatch ? 1.0 : 0.15;
        }

        // Depth filtering
        if (selectedDepth !== "all" && typeof node.depth === "number") {
          if (selectedDepth === 0 && node.depth !== 0) opacity = 0.1;
          if (selectedDepth === 1 && node.depth > 1) opacity = 0.1;
          if (selectedDepth === 2 && node.depth > 2) opacity = 0.1;
        }

        ctx.globalAlpha = opacity;

        const baseRadius = node.size || 10;
        const radius = baseRadius * (isHovered ? 1.35 : isCommitModified ? 1.25 : 1.0);

        // A. Directory Hub glowing neural aura
        if (node.type === "directory") {
          const auraRadius = radius * (node.depth === 0 ? 2.8 : 2.0);
          const auraColor = node.baseColor || node.color || "#8b5cf6";
          const gradient = ctx.createRadialGradient(node.x, node.y, radius * 0.4, node.x, node.y, auraRadius);
          gradient.addColorStop(0, auraColor + (isHovered ? "88" : "44"));
          gradient.addColorStop(1, auraColor + "00");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, auraRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // B. Commit State Pulsing Aura (In Time Machine Mode)
        if (isCommitModified && commitInfo) {
          const pulsePhase = Math.sin(time * 4) * 0.5 + 0.5;
          const pulseRadius = radius * (1.6 + pulsePhase * 0.6);
          const commitColor = 
            commitInfo.status === "added" ? "#10b981" :
            commitInfo.status === "removed" ? "#ef4444" : "#f59e0b";

          ctx.fillStyle = commitColor + "33";
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = commitColor;
          ctx.lineWidth = 2 / k;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // C. Core Node Dot
        let coreColor = node.color || "#818cf8";
        if (isSearchMatch) coreColor = "#fbbf24";
        if (isCommitModified && commitInfo) {
          coreColor = commitInfo.status === "added" ? "#10b981" :
                      commitInfo.status === "removed" ? "#ef4444" : "#f59e0b";
        }

        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // D. Outer Synapse Ring
        ctx.strokeStyle = isHovered 
          ? "#ffffff" 
          : isSearchMatch 
            ? "#f59e0b" 
            : isCommitModified
              ? "#ffffff"
              : "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = (isHovered || isCommitModified ? 2.2 : 1) / k;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // E. Commit status badge mini-indicator
        if (isCommitModified && commitInfo && k > 0.65) {
          ctx.font = `bold ${Math.max(8, 9 / k)}px -apple-system, sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const statusIcon = commitInfo.status === "added" ? "+" : commitInfo.status === "removed" ? "-" : "~";
          ctx.fillText(statusIcon, node.x, node.y);
        }

        // F. Text Labels with Dynamic Level of Detail
        const showLabel = 
          node.type === "directory" ||
          isHovered ||
          isSearchMatch ||
          isCommitModified ||
          (k > 0.9 && (node.inDegree || 0) > 0) ||
          (k > 1.3);

        if (showLabel && opacity > 0.3) {
          const fontSize = node.type === "directory" 
            ? (node.depth === 0 ? "bold 13px" : "bold 11px")
            : "10px";
          ctx.font = `${fontSize} -apple-system, sans-serif`;
          
          if (isCommitModified) {
            ctx.fillStyle = "#fbbf24";
          } else if (isHovered) {
            ctx.fillStyle = "#ffffff";
          } else {
            ctx.fillStyle = "rgba(226, 232, 240, 0.88)";
          }
          
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(node.name, node.x, node.y + radius + 4 / k);

          // Subtitle for commit changes
          if (isCommitModified && commitInfo && k > 0.75) {
            ctx.font = "9px -apple-system, sans-serif";
            ctx.fillStyle = "#94a3b8";
            const diffText = `+${commitInfo.additions || 0} / -${commitInfo.deletions || 0}`;
            ctx.fillText(diffText, node.x, node.y + radius + 17 / k);
          }
        }

        ctx.globalAlpha = 1;
      });

      ctx.restore();

      // Continue animation loop for particles and pulsing
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start render loop
    animationFrameRef.current = requestAnimationFrame(render);

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      simulation.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [data, commitFileMap, hoveredNode, searchQuery, selectedBranch, selectedDepth, particlesEnabled, isTimeMachineMode]);

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
        simulationRef.current?.alphaTarget(0.2).restart();
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
    let foundNode: any = null;
    const simNodes = nodesRef.current;

    for (let i = simNodes.length - 1; i >= 0; i--) {
      const node = simNodes[i];
      const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
      if (dist <= (node.size || 10) * 1.4) {
        foundNode = node;
        break;
      }
    }

    setHoveredNode(foundNode);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    const pos = getCanvasMousePos(e);
    const simNodes = nodesRef.current;
    let foundNode: any = null;

    for (let i = simNodes.length - 1; i >= 0; i--) {
      const node = simNodes[i];
      const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
      if (dist <= (node.size || 10) * 1.4) {
        foundNode = node;
        break;
      }
    }

    if (foundNode) {
      draggedNodeRef.current = foundNode;
      foundNode.fx = foundNode.x;
      foundNode.fy = foundNode.y;
      simulationRef.current?.alphaTarget(0.3).restart();
    } else {
      draggedNodeRef.current = null;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      simulationRef.current?.alphaTarget(0);
      draggedNodeRef.current = null;
    }
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    const simNodes = nodesRef.current;
    for (let i = simNodes.length - 1; i >= 0; i--) {
      const node = simNodes[i];
      const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
      if (dist <= (node.size || 10) * 1.5) {
        if (onSelectNode) onSelectNode(node);
        break;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newK = Math.max(0.2, Math.min(3.5, transformRef.current.k * zoomFactor));

    transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newK / transformRef.current.k);
    transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newK / transformRef.current.k);
    transformRef.current.k = newK;
  };

  const resetView = () => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth || 800;
    const h = containerRef.current.clientHeight || 600;
    transformRef.current = { x: w / 2, y: h / 2, k: 0.82 };
    simulationRef.current?.alpha(0.3).restart();
  };

  const zoomIn = () => {
    transformRef.current.k = Math.min(3.5, transformRef.current.k * 1.25);
  };

  const zoomOut = () => {
    transformRef.current.k = Math.max(0.2, transformRef.current.k * 0.8);
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full bg-[#080c15] overflow-hidden select-none ${className}`}
    >
      {/* Top Floating Bar: Branch Selector & Neural Legend */}
      <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Main Folder Neural Branches */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-auto">
          <button
            onClick={() => setSelectedBranch(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all flex items-center space-x-1.5 ${
              selectedBranch === null
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Neural Branches</span>
          </button>

          {rootFolders.map((rf) => {
            const isSelected = selectedBranch === rf.name;
            return (
              <button
                key={rf.name}
                onClick={() => setSelectedBranch(isSelected ? null : rf.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all flex items-center space-x-2 border ${
                  isSelected
                    ? "bg-white/10 text-white shadow-lg border-white/25"
                    : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5"
                }`}
                style={{
                  borderLeftColor: isSelected ? rf.color : "transparent",
                  borderLeftWidth: isSelected ? "3px" : "1px"
                }}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: rf.color, boxShadow: `0 0 8px ${rf.color}88` }}
                />
                <span>{rf.name}</span>
                <span className="text-[10px] text-slate-500 font-normal">({rf.file_count})</span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Controls */}
        <div className="flex items-center space-x-2 p-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search neural AST..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44 font-mono"
            />
          </div>

          {/* Depth Selector */}
          <select
            value={selectedDepth}
            onChange={(e) => setSelectedDepth(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 font-mono focus:outline-none"
          >
            <option value="all">Depth: All</option>
            <option value="0">Depth: Roots</option>
            <option value="1">Depth: L1 Subdirs</option>
            <option value="2">Depth: L2 Files</option>
          </select>

          {/* Toggle Synapse Pulses */}
          <button
            onClick={() => setParticlesEnabled(!particlesEnabled)}
            title={particlesEnabled ? "Disable Electrical Pulses" : "Enable Electrical Pulses"}
            className={`p-1.5 rounded-xl text-xs transition-colors border ${
              particlesEnabled 
                ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40" 
                : "bg-slate-900 text-slate-500 border-white/10 hover:text-slate-300"
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating HUD: Time Machine Commit Overlay Notice */}
      {isTimeMachineMode && (
        <div className="absolute top-16 left-4 z-10 pointer-events-none">
          <div className="p-3 rounded-2xl bg-amber-950/70 backdrop-blur-xl border border-amber-500/30 shadow-2xl flex items-center space-x-3 text-xs text-amber-200 font-mono pointer-events-auto">
            <GitCommit className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <div className="font-bold flex items-center space-x-2">
                <span>Commit Synaptic Map Active</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {commitFiles.length} Touched Nodes
                </span>
              </div>
              <div className="text-[11px] text-amber-300/70 mt-0.5">
                Pulsing nodes highlight files modified, added (+), or deleted (-) in this commit.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Bottom Floating Navigation Tools */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center space-x-1.5 p-1 rounded-xl bg-slate-950/80 backdrop-blur-xl border border-white/10 shadow-2xl text-slate-300">
        <button
          onClick={zoomIn}
          title="Zoom In"
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-white/10 my-auto" />
        <button
          onClick={resetView}
          title="Reset Cosmos View"
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Hovered Node Quick Preview Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 z-10 pointer-events-none p-3.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/15 shadow-2xl font-mono text-xs max-w-sm">
          <div className="flex items-center space-x-2">
            {hoveredNode.type === "directory" ? (
              <Folder className="w-4 h-4 text-violet-400" />
            ) : (
              <FileCode className="w-4 h-4 text-sky-400" />
            )}
            <span className="font-bold text-slate-100 truncate">{hoveredNode.name}</span>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
              {hoveredNode.type}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {hoveredNode.path || "Repository Root"}
          </div>

          <div className="mt-2 pt-2 border-t border-white/10 flex items-center space-x-3 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-500">Branch: </span>
              <span className="font-semibold" style={{ color: hoveredNode.baseColor || hoveredNode.color }}>
                {hoveredNode.rootFolder || "Core"}
              </span>
            </div>
            {hoveredNode.lineCount !== undefined && (
              <div>
                <span className="text-slate-500">Lines: </span>
                <span className="text-slate-200">{hoveredNode.lineCount}</span>
              </div>
            )}
            {hoveredNode.architecturalRole && (
              <div>
                <span className="text-slate-500">Role: </span>
                <span className="text-slate-200">{hoveredNode.architecturalRole}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
