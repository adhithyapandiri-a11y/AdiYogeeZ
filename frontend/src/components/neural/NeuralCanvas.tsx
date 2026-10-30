"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { LocateFixed, Maximize2, Minus, Plus } from "lucide-react";
import { endpoint, type NeuralNode, type NeuralLink } from "./model";
interface Props {
  nodes: NeuralNode[];
  links: NeuralLink[];
  selected: string | null;
  focus: number;
  onSelect: (node: NeuralNode) => void;
  onToggle: (path: string) => void;
}
export default function NeuralCanvas({
  nodes,
  links,
  selected,
  focus,
  onSelect,
  onToggle,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const graph = useRef<ForceGraphMethods<NeuralNode, NeuralLink> | undefined>(
    undefined,
  );
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [notice, setNotice] = useState("");
  const [reduced, setReduced] = useState(false);
  const initialized = useRef(false);
  const data = useMemo(() => ({ nodes, links }), [nodes, links]);
  const neighbours = useMemo(() => {
    const node = nodes.find((n) => n.path === selected);
    const ids = new Set<string>(node ? [node.id] : []);
    if (node)
      for (const l of links)
        if (endpoint(l.source) === node.id || endpoint(l.target) === node.id) {
          ids.add(endpoint(l.source));
          ids.add(endpoint(l.target));
        }
    return ids;
  }, [selected, nodes, links]);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const frame = requestAnimationFrame(() => {
      setWebgl(!!context);
      setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
    });
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      }),
    );
    if (container.current) observer.observe(container.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    initialized.current = false;
  }, [nodes, links]);
  useEffect(() => {
    if (!webgl || !graph.current) return;
    graph.current.d3Force("charge")?.strength(-160);
    graph.current
      .d3Force("link")
      ?.distance((link: NeuralLink) => (link.type === "contains" ? 45 : 75));
    graph.current.d3ReheatSimulation();
  }, [webgl]);
  useEffect(() => {
    if (!graph.current || !selected) return;
    const node = nodes.find((n) => n.path === selected);
    if (node && node.x !== undefined) {
      const position = {
        x: node.x + 60,
        y: (node.y || 0) + 35,
        z: (node.z || 0) + 150,
      };
      graph.current.cameraPosition(
        position,
        { x: node.x, y: node.y || 0, z: node.z || 0 },
        reduced ? 0 : 650,
      );
    }
  }, [selected, focus, nodes, reduced]);
  function zoom(factor: number) {
    const camera = graph.current?.camera();
    if (!camera || !graph.current) return;
    const target = (
      graph.current.controls() as {
        target: { x: number; y: number; z: number };
      }
    ).target;
    graph.current.cameraPosition(
      {
        x: target.x + (camera.position.x - target.x) * factor,
        y: target.y + (camera.position.y - target.y) * factor,
        z: target.z + (camera.position.z - target.z) * factor,
      },
      target,
      reduced ? 0 : 300,
    );
  }
  return (
    <div
      className="neural-canvas"
      ref={container}
      aria-label="Interactive 3D repository graph"
    >
      {webgl === false ? (
        <div className="neural-empty">
          <h3>3D rendering is unavailable</h3>
          <p>
            Enable WebGL or hardware acceleration. You can still explore every
            file in the file tree.
          </p>
        </div>
      ) : (
        webgl &&
        size.width > 1 && (
          <ForceGraph3D
            ref={graph}
            width={size.width}
            height={size.height}
            graphData={data}
            backgroundColor="#101010"
            showNavInfo={false}
            nodeLabel={() => ""}
            nodeVal={(n) => (n.type === "directory" ? 8 : 2)}
            nodeResolution={12}
            nodeColor={(n) =>
              !selected || neighbours.has(n.id)
                ? n.type === "directory"
                  ? "#E8E4D3"
                  : "#BDB8A8"
                : "#4D4B45"
            }
            nodeOpacity={1}
            linkColor={(l) =>
              selected &&
              neighbours.has(endpoint(l.source)) &&
              neighbours.has(endpoint(l.target))
                ? "#E8E4D3"
                : l.type === "contains"
                  ? "#55534B"
                  : "#8D8878"
            }
            linkOpacity={0.55}
            linkWidth={(l) => (l.type === "contains" ? 0.35 : 0.7)}
            linkDirectionalArrowLength={(l) => (l.type === "contains" ? 0 : 2)}
            nodeThreeObjectExtend
            nodeThreeObject={(n: NeuralNode) => {
              if (n.type !== "directory" && n.path !== selected)
                return undefined!;
              const label = new SpriteText(n.name);
              label.color = "#E8E4D3";
              label.backgroundColor = "#191919";
              label.padding = 2;
              label.textHeight = 4.5;
              label.position.y = 8;
              return label;
            }}
            onNodeClick={(n) => onSelect(n)}
            onNodeRightClick={(n) => {
              if (n.type === "directory") onToggle(n.path);
            }}
            onNodeHover={(n) => {
              if (container.current)
                container.current.style.cursor = n ? "pointer" : "grab";
            }}
            cooldownTicks={reduced ? 1 : 100}
            warmupTicks={80}
            onEngineStop={() => {
              if (!initialized.current && !selected) {
                graph.current?.zoomToFit(reduced ? 0 : 600, 30);
                initialized.current = true;
              }
            }}
          />
        )
      )}
      <div className="neural-tools" aria-label="Graph camera controls">
        <button
          title="Reset camera"
          aria-label="Reset camera"
          onClick={() => graph.current?.zoomToFit(reduced ? 0 : 500, 30)}
        >
          <LocateFixed size={16} />
        </button>
        <button title="Zoom in" aria-label="Zoom in" onClick={() => zoom(0.75)}>
          <Plus size={16} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => zoom(1.3)}
        >
          <Minus size={16} />
        </button>
        <button
          title="Fullscreen graph"
          aria-label="Fullscreen graph"
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await container.current?.parentElement?.requestFullscreen();
            } catch {
              setNotice("Fullscreen is unavailable in this browser.");
            }
          }}
        >
          <Maximize2 size={16} />
        </button>
      </div>
      {notice && (
        <p role="status" className="neural-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
