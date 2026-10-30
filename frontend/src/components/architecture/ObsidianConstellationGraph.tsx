"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import cytoscape, { type Core, type ElementDefinition, type NodeSingular } from "cytoscape";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceX,
  forceY,
} from "d3-force";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  Maximize2,
  Sparkles,
  Layers,
  X,
  FileCode,
  Folder,
  Code,
  ExternalLink,
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const handlersRef = useRef({ onSelectNode });

  useEffect(() => {
    handlersRef.current = { onSelectNode };
  }, [onSelectNode]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ALL");
  const [hoveredNode, setHoveredNode] = useState<ObsidianNode | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);

  // Extract unique languages
  const languages = useMemo(() => {
    return Array.from(
      new Set(
        data.nodes
          .map((n) => n.language)
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [data.nodes]);

  // Synchronize visual state (selection, search highlights, language filters)
  const syncVisualState = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      // 1. Reset transient classes
      cy.elements().removeClass("hovered connected highlighted dimmed search-match filtered-out selected");

      // 2. Language filtering
      if (selectedLanguage !== "ALL") {
        cy.nodes().forEach((node) => {
          const type = node.data("type");
          const lang = node.data("language");
          // Keep directories visible so hierarchy remains sensible
          if (type === "file" && lang !== selectedLanguage) {
            node.addClass("filtered-out");
            node.connectedEdges().addClass("filtered-out");
          }
          if (type === "symbol") {
            const parentLang = node.data("parentLanguage");
            if (parentLang && parentLang !== selectedLanguage) {
              node.addClass("filtered-out");
              node.connectedEdges().addClass("filtered-out");
            }
          }
        });
      }

      // 3. Search query highlighting
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        let anyMatch = false;
        cy.nodes().forEach((node) => {
          if (node.hasClass("filtered-out")) return;
          const name = (node.data("label") || "").toLowerCase();
          const path = (node.data("path") || "").toLowerCase();
          if (name.includes(query) || path.includes(query)) {
            node.addClass("search-match");
            anyMatch = true;
          } else {
            node.addClass("dimmed");
          }
        });
        if (anyMatch) {
          cy.edges().addClass("dimmed");
        }
      }

      // 4. File selection highlight
      if (selectedFilePath) {
        const target = cy.nodes().filter((n) => {
          const p = n.data("path");
          const id = n.data("id");
          return p === selectedFilePath || id === `file:${selectedFilePath}`;
        });

        if (target.length > 0) {
          target.addClass("selected");
          target.connectedEdges().addClass("highlighted");
          target.neighborhood().nodes().addClass("connected");
          if (!query) {
            cy.elements().not(target).not(target.neighborhood()).not(target.connectedEdges()).addClass("dimmed");
          }
        }
      }
    });
  }, [searchQuery, selectedLanguage, selectedFilePath]);

  // Initialize layout once per data snapshot using D3 Force -> Cytoscape preset layout
  useEffect(() => {
    if (!containerRef.current || !data.nodes || data.nodes.length === 0) return;

    const validNodeIds = new Set(data.nodes.map((n) => n.id));

    // 1. D3 Force layout pre-calculation (Deterministic & Static)
    interface SimPoint {
      id: string;
      type: string;
      size: number;
      x: number;
      y: number;
    }

    const simPoints: SimPoint[] = data.nodes.map((n, i) => {
      // Sunflower spiral initial placement for balanced dispersion
      const phi = i * 2.39996;
      const r = Math.sqrt(i + 1) * 38;
      return {
        id: n.id,
        type: n.type,
        size: n.size || (n.type === "directory" ? 24 : n.type === "file" ? 12 : 6),
        x: Math.cos(phi) * r,
        y: Math.sin(phi) * r,
      };
    });

    const simLinks = data.links
      .filter((l) => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        return validNodeIds.has(s) && validNodeIds.has(t);
      })
      .map((l) => ({
        source: typeof l.source === "object" ? l.source.id : l.source,
        target: typeof l.target === "object" ? l.target.id : l.target,
        type: l.type,
      }));

    const simulation = forceSimulation(simPoints as any)
      .force(
        "link",
        forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance((l: any) => {
            if (l.type === "has_symbol") return 22;
            if (l.type === "contains") return 48;
            return 115;
          })
          .strength((l: any) => {
            if (l.type === "has_symbol") return 0.95;
            if (l.type === "contains") return 0.85;
            return 0.15;
          })
      )
      .force(
        "charge",
        forceManyBody().strength((d: any) => {
          if (d.type === "directory") return -240;
          if (d.type === "symbol") return -14;
          return -55;
        })
      )
      .force(
        "collide",
        forceCollide().radius((d: any) => (d.size || 8) + 7)
      )
      .force("center", forceCenter(0, 0).strength(0.04))
      .force("x", forceX(0).strength(0.018))
      .force("y", forceY(0).strength(0.018))
      .stop();

    // Run 160 static ticks synchronously once
    simulation.tick(160);

    // Save stable positions
    positionsRef.current = new Map(
      simPoints.map((p) => [p.id, { x: p.x || 0, y: p.y || 0 }])
    );

    // 2. Build Cytoscape element definitions
    const elements: ElementDefinition[] = [
      ...data.nodes.map((node) => {
        const pos = positionsRef.current.get(node.id) || { x: 0, y: 0 };
        const isDir = node.type === "directory";
        const isSym = node.type === "symbol";

        return {
          data: {
            id: node.id,
            label: node.name,
            type: node.type,
            path: node.path,
            language: node.language || "",
            size: isDir ? 26 : isSym ? 6 : Math.max(10, Math.min(18, (node.size || 10) * 0.8)),
            color: node.color || (isDir ? "#6366f1" : isSym ? "#38bdf8" : "#818cf8"),
            fontSize: isDir ? 11 : isSym ? 8 : 10,
            rawNode: node,
          },
          position: { x: pos.x, y: pos.y },
          classes: `${node.type} ${node.language ? `lang-${node.language}` : ""}`,
        };
      }),
      ...simLinks.map((link, idx) => {
        const sourceId = typeof link.source === "object" ? (link.source as any).id : link.source;
        const targetId = typeof link.target === "object" ? (link.target as any).id : link.target;
        return {
          data: {
            id: `edge-${idx}-${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
            type: link.type,
          },
          classes: `${link.type}`,
        };
      }),
    ];

    // 3. Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: { name: "preset" },
      minZoom: 0.12,
      maxZoom: 3.5,
      selectionType: "single",
      boxSelectionEnabled: false,
      autoungrabify: false,
      style: [
        // Base Node Style
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            width: "data(size)",
            height: "data(size)",
            label: "data(label)",
            "font-family": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            "font-size": "data(fontSize)",
            color: "rgba(226, 232, 240, 0.85)",
            "text-valign": "bottom",
            "text-margin-y": 5,
            "text-outline-color": "#090d16",
            "text-outline-width": 2.5,
            "text-outline-opacity": 0.95,
            "min-zoomed-font-size": 8,
            "border-width": 0,
            "overlay-opacity": 0,
            "transition-property": "opacity, border-width, border-color",
            "transition-duration": 0.15,
          },
        },
        // Directory Hub Style (Concentric orbital aura)
        {
          selector: "node.directory",
          style: {
            shape: "ellipse",
            "border-width": 2,
            "border-color": "rgba(129, 140, 248, 0.65)",
            "border-style": "dashed",
            "background-color": "#4f46e5",
            color: "#ffffff",
            "font-weight": 600,
            "font-size": 11,
            "text-margin-y": 7,
          },
        },
        // File Star Node Style
        {
          selector: "node.file",
          style: {
            shape: "ellipse",
            "border-width": 1,
            "border-color": "rgba(255, 255, 255, 0.35)",
            "border-style": "solid",
          },
        },
        // Symbol Satellite Node Style
        {
          selector: "node.symbol",
          style: {
            shape: "ellipse",
            "border-width": 0.5,
            "border-color": "rgba(255, 255, 255, 0.2)",
            color: "#94a3b8",
            "font-size": 8,
          },
        },
        // Base Edge Style
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "rgba(148, 163, 184, 0.15)",
            "curve-style": "straight",
            "overlay-opacity": 0,
            "transition-property": "line-color, width, opacity",
            "transition-duration": 0.15,
          },
        },
        // Containment Links
        {
          selector: "edge.contains",
          style: {
            "line-color": "rgba(99, 102, 241, 0.22)",
            "line-style": "dashed",
            width: 1,
          },
        },
        // Symbol Links
        {
          selector: "edge.has_symbol",
          style: {
            "line-color": "rgba(56, 189, 248, 0.18)",
            width: 0.8,
          },
        },
        // Imports / Calls Links
        {
          selector: "edge.imports",
          style: {
            "line-color": "rgba(129, 140, 248, 0.4)",
            width: 1.2,
            "target-arrow-shape": "triangle",
            "target-arrow-color": "rgba(129, 140, 248, 0.6)",
            "arrow-scale": 0.6,
          },
        },
        // Hover & Interaction Overrides
        {
          selector: "node.hovered",
          style: {
            "border-width": 3,
            "border-color": "#ffffff",
            "border-style": "solid",
            color: "#ffffff",
            "font-weight": 700,
            opacity: 1,
            "z-index": 999,
          },
        },
        {
          selector: "node.connected",
          style: {
            opacity: 1,
            "border-width": 2,
            "border-color": "#a5b4fc",
            "border-style": "solid",
            color: "#ffffff",
            "z-index": 900,
          },
        },
        {
          selector: "edge.highlighted",
          style: {
            width: 2.2,
            "line-color": "#818cf8",
            "target-arrow-color": "#818cf8",
            opacity: 1,
            "z-index": 900,
          },
        },
        {
          selector: "node.dimmed",
          style: {
            opacity: 0.1,
          },
        },
        {
          selector: "edge.dimmed",
          style: {
            opacity: 0.03,
          },
        },
        // Selected File Node
        {
          selector: "node.selected",
          style: {
            "border-width": 3.5,
            "border-color": "#38bdf8",
            "border-style": "solid",
            color: "#38bdf8",
            "font-weight": 700,
            opacity: 1,
            "z-index": 1000,
          },
        },
        // Search Matches
        {
          selector: "node.search-match",
          style: {
            "background-color": "#fbbf24",
            "border-width": 3,
            "border-color": "#f59e0b",
            "border-style": "solid",
            color: "#fbbf24",
            "font-weight": 700,
            opacity: 1,
            "z-index": 850,
          },
        },
        // Language Filter Out
        {
          selector: "node.filtered-out",
          style: {
            opacity: 0.04,
            events: "no",
          },
        },
        {
          selector: "edge.filtered-out",
          style: {
            opacity: 0.02,
            events: "no",
          },
        },
      ],
    });

    cyRef.current = cy;

    // Center and fit nicely initially
    cy.fit(undefined, 50);
    setZoomPercent(Math.round(cy.zoom() * 100));

    // Interaction Handlers
    cy.on("zoom", () => {
      setZoomPercent(Math.round(cy.zoom() * 100));
    });

    // Node Click / Tap
    cy.on("tap", "node", (evt) => {
      const node = evt.target as NodeSingular;
      const rawNode = node.data("rawNode") as ObsidianNode;
      if (rawNode) {
        handlersRef.current.onSelectNode(rawNode);
      }
    });

    // Node Hover (Mouseover) - Instant CSS Class Toggle, 0 Physics Simulation
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target as NodeSingular;
      const rawNode = node.data("rawNode") as ObsidianNode;
      setHoveredNode(rawNode);

      cy.batch(() => {
        cy.elements().addClass("dimmed");
        node.removeClass("dimmed").addClass("hovered");
        const neighborhood = node.neighborhood();
        neighborhood.removeClass("dimmed");
        node.connectedEdges().addClass("highlighted");
        neighborhood.nodes().addClass("connected");
      });
    });

    // Node Unhover (Mouseout) - Restore Visual State Cleanly
    cy.on("mouseout", "node", () => {
      setHoveredNode(null);
      syncVisualState();
    });

    // Drag-end saves node position
    cy.on("dragfree", "node", (evt) => {
      const node = evt.target as NodeSingular;
      positionsRef.current.set(node.id(), { ...node.position() });
    });

    // Tap background clears selection
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setHoveredNode(null);
        syncVisualState();
      }
    });

    // Resize observer
    const observer = new ResizeObserver(() => {
      cy.resize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, [data, syncVisualState]);

  // Re-run sync when visual filters change
  useEffect(() => {
    syncVisualState();
  }, [syncVisualState]);

  // Animate to selected node if selectedFilePath changes externally
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !selectedFilePath) return;

    const target = cy.nodes().filter((n) => {
      const p = n.data("path");
      const id = n.data("id");
      return p === selectedFilePath || id === `file:${selectedFilePath}`;
    });

    if (target.length > 0) {
      cy.animate({
        center: { eles: target },
        zoom: Math.max(cy.zoom(), 1.15),
        duration: 350,
      });
    }
  }, [selectedFilePath]);

  // Handle Search Enter key to jump to first match
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const cy = cyRef.current;
      if (!cy) return;
      const matches = cy.nodes(".search-match");
      if (matches.length > 0) {
        cy.animate({
          center: { eles: matches.first() },
          zoom: 1.35,
          duration: 350,
        });
        const rawNode = matches.first().data("rawNode");
        if (rawNode) {
          onSelectNode(rawNode);
        }
      }
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({
      zoom: Math.min(3.5, cy.zoom() * 1.3),
      duration: 200,
    });
  };

  const handleZoomOut = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({
      zoom: Math.max(0.12, cy.zoom() / 1.3),
      duration: 200,
    });
  };

  const handleFit = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({
      fit: { eles: cy.elements(), padding: 45 },
      duration: 350,
    });
  };

  const handleResetZoom = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({
      fit: { eles: cy.elements(), padding: 45 },
      duration: 350,
    });
  };

  return (
    <div className="relative w-full h-full bg-[#090d16] overflow-hidden select-none">
      {/* Background Subtle Cosmic Starfield Texture */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-[#090d16]/60 to-[#040711]" />

      {/* Subtle Coordinate Grid Lines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full relative z-10" />

      {/* Floating Top Controls & Search Bar */}
      <div className="absolute top-3.5 left-4 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-2rem)]">
        {/* Search Input */}
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
            onClick={handleFit}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Fit to View"
            aria-label="Fit graph to view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
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
