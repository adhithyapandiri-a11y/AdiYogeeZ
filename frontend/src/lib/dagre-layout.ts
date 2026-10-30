import dagre from "dagre";
import { Node, Edge } from "@xyflow/react";

interface LayoutOptions {
  direction?: "TB" | "LR";
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = "LR",
    nodeWidth = 260,
    nodeHeight = 110,
    rankSep = 80,
    nodeSep = 50,
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
    align: "UL",
    ranker: "network-simplex",
  });

  nodes.forEach((node) => {
    // Specific size estimates based on custom node types
    let w = nodeWidth;
    let h = nodeHeight;

    if (node.type === "directoryNode") {
      w = 260;
      h = 95;
    } else if (node.type === "fileNode" || node.type === "fileDepNode") {
      w = 270;
      h = 105;
    } else if (node.type === "moduleNode") {
      w = 290;
      h = 135;
    } else if (node.type === "featureStageNode") {
      w = 310;
      h = 210;
    }

    dagreGraph.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    let w = nodeWidth;
    let h = nodeHeight;

    if (node.type === "directoryNode") {
      w = 260;
      h = 95;
    } else if (node.type === "fileNode" || node.type === "fileDepNode") {
      w = 270;
      h = 105;
    } else if (node.type === "moduleNode") {
      w = 290;
      h = 135;
    } else if (node.type === "featureStageNode") {
      w = 310;
      h = 210;
    }

    return {
      ...node,
      targetPosition: direction === "LR" ? "left" : "top",
      sourcePosition: direction === "LR" ? "right" : "bottom",
      position: {
        x: nodeWithPosition.x - w / 2,
        y: nodeWithPosition.y - h / 2,
      },
    } as Node;
  });

  return { nodes: layoutedNodes, edges };
}
