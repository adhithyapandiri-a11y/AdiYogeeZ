import { test, expect } from "@playwright/test";

const repo = {
  id: 1,
  name: "express",
  owner: "expressjs",
  github_url: "https://github.com/expressjs/express",
  primary_language: "JavaScript",
  description: "Fast web framework",
  stars: 69000,
  forks: 25000,
  indexing_status: "completed",
  progress_percent: 100,
  file_count: 5,
  function_count: 8,
  class_count: 2,
  dependency_count: 3,
  module_count: 2,
  languages: { JavaScript: 4, TypeScript: 1 },
};

const structure = {
  nodes: [
    {
      id: "dir:root",
      type: "directoryNode",
      data: {
        name: "Repository Root",
        path: "",
        is_root: true,
        file_count: 2,
        folder_count: 1,
        languages: ["JavaScript"],
        architectural_role: "Root Workspace",
        depth: 0,
      },
    },
    {
      id: "dir:lib",
      type: "directoryNode",
      data: {
        name: "lib",
        path: "lib",
        file_count: 2,
        folder_count: 0,
        languages: ["JavaScript"],
        architectural_role: "Core",
        depth: 1,
      },
    },
    {
      id: "file:lib/express.js",
      type: "fileNode",
      data: {
        name: "express.js",
        path: "lib/express.js",
        language: "JavaScript",
        line_count: 120,
        size: 3400,
        depth: 2,
      },
    },
  ],
  edges: [],
  stats: {
    total_files: 2,
    total_directories: 1,
    max_depth: 2,
    languages: { JavaScript: 2 },
  },
};

const obsidianData = {
  nodes: [
    {
      id: "dir:lib",
      name: "lib",
      type: "directory",
      path: "lib",
      size: 26,
      color: "#6366f1",
      depth: 0,
      fileCount: 2,
    },
    {
      id: "file:lib/express.js",
      name: "express.js",
      type: "file",
      path: "lib/express.js",
      size: 14,
      color: "#f59e0b",
      language: "JavaScript",
      lineCount: 120,
      functionCount: 4,
    },
    {
      id: "sym:createApplication",
      name: "createApplication",
      type: "symbol",
      path: "lib/express.js",
      size: 6,
      color: "#38bdf8",
      symbolType: "function",
    },
  ],
  links: [
    { source: "dir:lib", target: "file:lib/express.js", type: "contains", value: 1 },
    { source: "file:lib/express.js", target: "sym:createApplication", type: "has_symbol", value: 1 },
  ],
  stats: {
    total_nodes: 3,
    total_links: 2,
    total_directories: 1,
    total_files: 1,
  },
};

test("Obsidian Cosmos renders smoothly with Cytoscape and handles search and selection", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    console.log("MOCK ROUTE:", url.pathname);
    let body: unknown = {};
    if (url.pathname.endsWith("/repos")) body = [repo];
    else if (url.pathname.endsWith("/repos/1")) body = repo;
    else if (url.pathname.includes("/project-structure/")) body = structure;
    else if (url.pathname.includes("/obsidian/")) body = obsidianData;
    else if (url.pathname.includes("/node-details/")) {
      body = {
        file_path: "lib/express.js",
        language: "JavaScript",
        line_count: 120,
        file_size: 3400,
        preview: "// lib/express.js\nfunction createApplication() { return {}; }",
        functions: [{ name: "createApplication", lines: "1-10", type: "function" }],
        classes: [],
        incoming_dependencies: [],
        outgoing_dependencies: [],
      };
    }
    await route.fulfill({ json: body });
  });

  await page.goto("/workspace/1/architecture");

  // Switch to Obsidian Cosmos tab
  const cosmosTab = page.getByRole("button", { name: /Obsidian Cosmos/ });
  await expect(cosmosTab).toBeVisible();
  await cosmosTab.click();

  // Cytoscape canvas container should be visible and rendered
  await expect(page.getByText("3D Obsidian Cosmos", { exact: true })).toBeVisible();
  const searchInput = page.getByPlaceholder("Search 3D constellation (Enter to fly)...");
  await expect(searchInput).toBeVisible();

  // Type search query
  await searchInput.fill("express.js");
  await searchInput.press("Enter");

  // Zoom controls
  await page.getByTitle("Zoom into 3D cosmos").click();
  await page.getByTitle("Reset 3D camera").click();

  // Take screenshot for visual record
  await page.screenshot({ path: "test-results/obsidian-cosmos-fixed.png" });

  expect(pageErrors).toEqual([]);
});
