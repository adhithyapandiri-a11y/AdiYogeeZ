import type {
  ProjectStructureResponse,
  Repository as IndexedRepository,
} from "@/lib/types";
import { ROOT, parentPath, type Entry, type Repository } from "./model";

/** Containment only: dependency edges never enter this view. Paths are identities. */
export function toMapRepository(
  data: ProjectStructureResponse,
  repoId: number,
  metadata?: IndexedRepository | null,
): Repository {
  const entries = new Map<string, Entry>();
  for (const node of data.nodes) {
    if (
      node.type === "directoryNode" &&
      "path" in node.data &&
      !node.data.is_root &&
      node.data.path
    ) {
      const path = node.data.path;
      entries.set(path, {
        path,
        name: path.split("/").pop()!,
        parent: parentPath(path),
        kind: "folder",
      });
    } else if (node.type === "fileNode" && "file_path" in node.data) {
      const path = node.data.file_path;
      entries.set(path, {
        path,
        name: node.data.raw_name || path.split("/").pop()!,
        parent: parentPath(path),
        kind: "file",
        size: node.data.file_size,
        color: node.data.color,
        language: node.data.language,
      });
    }
  }
  // Preserve ancestry even if a backend listing omitted an explicit directory.
  for (const entry of [...entries.values()]) {
    let parent = entry.parent;
    while (parent !== ROOT) {
      if (!entries.has(parent))
        entries.set(parent, {
          path: parent,
          name: parent.split("/").pop()!,
          parent: parentPath(parent),
          kind: "folder",
        });
      parent = parentPath(parent);
    }
  }
  return {
    owner: metadata?.owner || "",
    name: metadata?.name || `Repository ${repoId}`,
    branch: metadata?.default_branch || "",
    ref: metadata?.default_branch || "",
    entries: [...entries.values()].sort((a, b) => a.path.localeCompare(b.path)),
  };
}
