"use client";

import { useEffect, useRef, useState } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import { Minus, Plus, Scan, LocateFixed } from "lucide-react";
import { ROOT, colour, ancestors, type Entry, type Repository } from "./model";
interface Point extends SimulationNodeDatum {
  id: string;
  kind: string;
}
interface Props {
  repo: Repository;
  visible: Entry[];
  selected?: string;
  expanded: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  focus?: { path: string; sequence: number };
}
export function Graph({
  repo,
  visible,
  selected,
  expanded,
  onSelect,
  onToggle,
  focus,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const cy = useRef<Core | null>(null);
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const handlers = useRef({ onSelect, onToggle });
  useEffect(() => {
    handlers.current = { onSelect, onToggle };
  }, [onSelect, onToggle]);
  const [zoom, setZoom] = useState(100);
  const firstFit = useRef<Repository | undefined>(undefined);
  useEffect(() => {
    if (!container.current) return;
    firstFit.current = undefined;
    const points: Point[] = [
      { id: ROOT, kind: "folder", x: 0, y: 0, fx: 0, fy: 0 },
      ...repo.entries.map((e, i) => ({
        id: e.path,
        kind: e.kind,
        x: Math.cos(i * 2.39996) * Math.sqrt(i + 1) * 32,
        y: Math.sin(i * 2.39996) * Math.sqrt(i + 1) * 32,
      })),
    ];
    const links = repo.entries.map((e) => ({
      source: e.parent,
      target: e.path,
    }));
    const simulation = forceSimulation(points)
      .force(
        "link",
        forceLink<Point, { source: string | Point; target: string | Point }>(
          links,
        )
          .id((n) => n.id)
          .distance((l) => ((l.target as Point).kind === "folder" ? 130 : 85))
          .strength(0.8),
      )
      .force("charge", forceManyBody().strength(-180))
      .force(
        "collision",
        forceCollide<Point>()
          .radius((n) => (n.kind === "folder" ? 52 : 38))
          .iterations(2),
      )
      .force("x", forceX(0).strength(0.015))
      .force("y", forceY(0).strength(0.015))
      .stop();
    simulation.tick(180);
    positions.current = new Map(
      points.map((p) => [p.id, { x: p.x || 0, y: p.y || 0 }]),
    );
    const instance = cytoscape({
      container: container.current,
      elements: [],
      layout: { name: "preset" },
      minZoom: 0.15,
      maxZoom: 2.5,

      selectionType: "single",
      boxSelectionEnabled: false,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            width: 10,
            height: 10,
            label: "data(label)",
            "font-family": "system-ui, sans-serif",
            "font-size": 12,
            color: "#a9a8b5",
            "text-valign": "bottom",
            "text-margin-y": 10,
            "text-outline-color": "#090d16",
            "text-outline-width": 3,
            "overlay-opacity": 0,
            "border-width": 0,
            "min-zoomed-font-size": 9,
          },
        },
        {
          selector: "node.folder",
          style: {
            width: 22,
            height: 22,
            shape: "round-diamond",
            "background-color": "#b59aff",
            "border-width": 6,
            "border-color": "#b59aff",
            "border-opacity": 0.12,
            color: "#ded3f8",
            "font-weight": 600,
            "font-size": 14,
            "text-margin-y": 12,
          },
        },
        {
          selector: "node.root",
          style: {
            width: 34,
            height: 34,
            "border-width": 12,
            "border-opacity": 0.1,
            "font-size": 17,
            "font-weight": 700,
            color: "#f3edff",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#48424f",
            opacity: 0.65,
            "curve-style": "straight",
            "overlay-opacity": 0,
          },
        },
        { selector: ".muted", style: { opacity: 0.32 } },
        {
          selector: "edge.trail",
          style: { "line-color": "#b59aff", width: 2, opacity: 1 },
        },
        { selector: "node.trail", style: { color: "#e7daff", opacity: 1 } },
        {
          selector: "node.chosen",
          style: {
            "border-width": 4,
            "border-color": "#ffffff",
            "border-opacity": 1,
            color: "#ffffff",
            "font-weight": 700,
            "text-background-color": "#35303e",
            "text-background-opacity": 1,
            "text-background-padding": "5px",
            "text-background-shape": "roundrectangle",
            opacity: 1,
          },
        },
        {
          selector: "node.collapsed",
          style: {
            "border-style": "dashed",
            "border-width": 2,
            "border-opacity": 0.7,
          },
        },
      ],
    });
    cy.current = instance;
    instance.on("tap", "node", (event) => {
      const path = event.target.data("path");
      if (path === ROOT) return;
      handlers.current.onSelect(path);
      if (event.target.hasClass("folder")) handlers.current.onToggle(path);
    });
    instance.on("dragfree", "node", (event) =>
      positions.current.set(event.target.data("path"), {
        ...event.target.position(),
      }),
    );
    instance.on("zoom", () => setZoom(Math.round(instance.zoom() * 100)));
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.destroy();
      cy.current = null;
    };
  }, [repo]);
  useEffect(() => {
    const instance = cy.current;
    if (!instance) return;
    const ids = new Set([`n:${ROOT}`, ...visible.map((e) => `n:${e.path}`)]);
    instance.batch(() => {
      instance
        .nodes()
        .filter((n) => !ids.has(n.id()))
        .remove();
      const nodes: ElementDefinition[] = [
        {
          data: {
            id: `n:${ROOT}`,
            path: ROOT,
            label: repo.name,
            color: "#b59aff",
          },
          classes: "folder root",
          position: positions.current.get(ROOT),
        },
        ...visible.map((e) => ({
          data: {
            id: `n:${e.path}`,
            path: e.path,
            label: e.name,
            color: colour(e),
          },
          classes: e.kind === "folder" ? "folder" : "file",
          position: positions.current.get(e.path),
        })),
      ];
      for (const node of nodes)
        if (instance.getElementById(node.data.id!).empty()) instance.add(node);
      for (const e of visible) {
        const id = `edge:${e.path}`;
        if (instance.getElementById(id).empty())
          instance.add({
            data: { id, source: `n:${e.parent}`, target: `n:${e.path}` },
          });
      }
      instance.elements().removeClass("muted trail chosen collapsed");
      instance.nodes(".folder").forEach((n) => {
        if (n.data("path") !== ROOT && !expanded.has(n.data("path")))
          n.addClass("collapsed");
      });
      if (selected) {
        instance.elements().addClass("muted");
        for (const p of [...ancestors(selected), selected]) {
          instance
            .getElementById(`n:${p}`)
            .removeClass("muted")
            .addClass("trail");
          instance
            .getElementById(`edge:${p}`)
            .removeClass("muted")
            .addClass("trail");
        }
        instance.getElementById(`n:${selected}`).addClass("chosen");
      }
    });
    if (firstFit.current !== repo) {
      instance.fit(instance.elements(), 65);
      if (instance.zoom() > 1.05)
        instance.zoom({
          level: 1.05,
          renderedPosition: {
            x: instance.width() / 2,
            y: instance.height() / 2,
          },
        });
      firstFit.current = repo;
    }
  }, [repo, visible, selected, expanded]);
  useEffect(() => {
    const instance = cy.current;
    if (!instance || !focus) return;
    instance.resize();
    const node = instance.getElementById(`n:${focus.path}`);
    if (node.empty()) return;
    const opts = {
      center: { eles: node },
      zoom: Math.max(0.8, Math.min(instance.zoom(), 1.3)),
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      instance.zoom(opts.zoom);
      instance.center(node);
    } else instance.animate(opts, { duration: 250 });
  }, [focus]);
  return (
    <>
      <div
        className="absolute inset-x-0 top-0 bottom-16 cursor-grab touch-none"
        ref={container}
        style={{ position: "absolute" }}
        role="img"
        aria-label="Interactive folder containment graph. Use the Explorer file list or search for keyboard navigation."
      />
      <div className="absolute right-4 bottom-4 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1 text-slate-300 [&_button]:flex [&_button]:h-8 [&_button]:w-8 [&_button]:items-center [&_button]:justify-center [&_button]:rounded [&_button]:hover:bg-slate-800 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-violet-400 [&_button]:disabled:opacity-30 [&_span]:w-10 [&_span]:text-center [&_span]:text-xs [&_span]:tabular-nums">
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() =>
            cy.current?.zoom({
              level: cy.current.zoom() / 1.2,
              renderedPosition: {
                x: cy.current.width() / 2,
                y: cy.current.height() / 2,
              },
            })
          }
        >
          <Minus size={16} />
        </button>
        <span>{zoom}%</span>
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() =>
            cy.current?.zoom({
              level: cy.current.zoom() * 1.2,
              renderedPosition: {
                x: cy.current.width() / 2,
                y: cy.current.height() / 2,
              },
            })
          }
        >
          <Plus size={16} />
        </button>
        <i className="mx-1 h-4 w-px bg-slate-700" />
        <button
          title="Fit graph to view"
          aria-label="Fit graph to view"
          onClick={() => cy.current?.fit(cy.current.elements(), 50)}
        >
          <Scan size={17} />
        </button>
        <button
          title="Centre selected file"
          aria-label="Centre selected file"
          disabled={!selected}
          onClick={() => {
            const n = cy.current?.getElementById(`n:${selected!}`);
            if (n) cy.current?.center(n);
          }}
        >
          <LocateFixed size={17} />
        </button>
      </div>
    </>
  );
}
