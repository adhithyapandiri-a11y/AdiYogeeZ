export const ROOT = "/";
export const MAX_VISIBLE = 300;
export interface Entry {
  path: string;
  name: string;
  parent: string;
  kind: "folder" | "file" | "submodule";
  sha?: string;
  size?: number;
  mode?: string;
  color?: string;
  language?: string;
}
export interface Repository {
  owner: string;
  name: string;
  branch: string;
  ref: string;
  entries: Entry[];
  sample?: boolean;
  warning?: string;
  description?: string;
}
export interface ContainmentEdge {
  source: string;
  target: string;
}
export function parentPath(path: string) {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ROOT;
}
export function ancestors(path: string): string[] {
  const result = [ROOT];
  const parts = path.split("/");
  for (let i = 1; i < parts.length; i++)
    result.push(parts.slice(0, i).join("/"));
  return result;
}
export function searchEntries(entries: Entry[], query: string) {
  const q = query.trim().toLowerCase();
  return entries
    .filter((e) => e.path.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        Number(b.name.toLowerCase() === q) -
          Number(a.name.toLowerCase() === q) ||
        Number(b.name.toLowerCase().startsWith(q)) -
          Number(a.name.toLowerCase().startsWith(q)) ||
        a.path.localeCompare(b.path),
    );
}
export function visibleEntries(
  entries: Entry[],
  expanded: Set<string>,
  selected?: string,
) {
  const eligible = entries
    .filter((e) => ancestors(e.path).every((p) => expanded.has(p)))
    .sort(
      (a, b) =>
        a.path.split("/").length - b.path.split("/").length ||
        a.path.localeCompare(b.path),
    );
  // Reserve the selected chain before applying the rendering budget.
  const priority = new Set(selected ? [...ancestors(selected), selected] : []);
  const chosen = [
    ...eligible.filter((e) => priority.has(e.path)),
    ...eligible.filter((e) => !priority.has(e.path)),
  ].slice(0, MAX_VISIBLE - 1);
  return { entries: chosen, hidden: eligible.length - chosen.length };
}
export function colour(entry: Entry) {
  if (entry.color) return entry.color;
  if (entry.kind === "folder") return "#b59aff";
  const ext = entry.name.split(".").pop()?.toLowerCase();
  if (["ts", "tsx"].includes(ext || "")) return "#80b9f8";
  if (["js", "jsx", "json"].includes(ext || "")) return "#e5c276";
  if (["css", "scss", "html"].includes(ext || "")) return "#dc92b3";
  if (["md", "txt"].includes(ext || "")) return "#8fd4b3";
  return "#a9abbc";
}
