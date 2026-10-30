import type { ObsidianGraphData, ObsidianNode } from "@/lib/types";
export const NODE_LIMIT = 350;
export type NeuralNode = ObsidianNode & { x?: number; y?: number; z?: number };
export type NeuralLink = {
  source: string | NeuralNode;
  target: string | NeuralNode;
  type: string;
};
export const endpoint = (value: string | NeuralNode) =>
  typeof value === "string" ? value : value.id;
export const parentPath = (path: string) =>
  path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
/** Only containment is derived from paths. Dependencies always come from the indexer. */
export function prepareGraph(data: ObsidianGraphData) {
  const nodes = new Map<string, NeuralNode>();
  for (const n of data.nodes || [])
    if (n.type !== "symbol" && n.path) nodes.set(n.id, { ...n });
  const directoryPaths = new Set(
    [...nodes.values()]
      .filter((n) => n.type === "directory")
      .map((n) => n.path),
  );
  for (const n of [...nodes.values()]) {
    let path = parentPath(n.path);
    while (path) {
      if (!directoryPaths.has(path)) {
        directoryPaths.add(path);
        nodes.set(`dir:${path}`, {
          id: `dir:${path}`,
          name: path.split("/").pop()!,
          path,
          type: "directory",
          size: 16,
          color: "#E8E4D3",
        });
      }
      path = parentPath(path);
    }
  }
  const byPath = new Map(
    [...nodes.values()]
      .filter((n) => n.type === "directory")
      .map((n) => [n.path, n.id]),
  );
  const links: NeuralLink[] = [];
  for (const n of nodes.values()) {
    const parent = byPath.get(parentPath(n.path));
    if (parent && parent !== n.id)
      links.push({ source: parent, target: n.id, type: "contains" });
  }
  for (const l of data.links || []) {
    const source = typeof l.source === "string" ? l.source : l.source.id;
    const target = typeof l.target === "string" ? l.target : l.target.id;
    if (
      !["contains", "has_symbol"].includes(l.type) &&
      nodes.has(source) &&
      nodes.has(target)
    )
      links.push({ source, target, type: l.type });
  }
  return { nodes: [...nodes.values()], links };
}
export function visibleGraph(
  graph: ReturnType<typeof prepareGraph>,
  collapsed: Set<string>,
  selected: string | null,
  kind: string,
  relationships: string,
) {
  const eligible = graph.nodes.filter(
    (n) =>
      ![...collapsed].some((path) => n.path.startsWith(`${path}/`)) &&
      (kind === "all" || n.type === kind),
  );
  const priority = new Set<string>();
  if (selected) {
    let path = selected;
    while (path) {
      priority.add(path);
      path = parentPath(path);
    }
  }
  // Selected files stay discoverable even when a rendering budget is reached.
  eligible.sort(
    (a, b) =>
      Number(b.path === selected) - Number(a.path === selected) ||
      Number(priority.has(b.path)) - Number(priority.has(a.path)) ||
      Number(b.type === "directory") - Number(a.type === "directory") ||
      a.path.localeCompare(b.path),
  );
  const nodes = eligible.slice(0, NODE_LIMIT);
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    links: graph.links
      .filter(
        (l) =>
          ids.has(endpoint(l.source)) &&
          ids.has(endpoint(l.target)) &&
          (relationships === "all" ||
            (relationships === "contains"
              ? l.type === "contains"
              : l.type !== "contains")),
      )
      .map((l) => ({ ...l })),
    hidden: eligible.length - nodes.length,
  };
}
