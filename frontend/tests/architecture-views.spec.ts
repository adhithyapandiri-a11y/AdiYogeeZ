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
        is_root: false,
        file_count: 2,
        folder_count: 0,
        languages: ["JavaScript"],
        architectural_role: "Core Library",
        depth: 1,
      },
    },
    {
      id: "file:lib/express.js",
      type: "fileNode",
      data: {
        name: "express.js",
        raw_name: "express.js",
        file_path: "lib/express.js",
        language: "JavaScript",
        architectural_role: "Entry Point",
        line_count: 120,
        incoming_count: 0,
        outgoing_count: 2,
      },
    },
    {
      id: "file:lib/application.js",
      type: "fileNode",
      data: {
        name: "application.js",
        raw_name: "application.js",
        file_path: "lib/application.js",
        language: "JavaScript",
        architectural_role: "Service",
        line_count: 640,
        incoming_count: 1,
        outgoing_count: 1,
      },
    },
  ],
  edges: [
    {
      id: "e-dir-dir:root-dir:lib",
      source: "dir:root",
      target: "dir:lib",
      type: "hierarchyEdge",
    },
    {
      id: "e-file-dir:lib-file:lib/express.js",
      source: "dir:lib",
      target: "file:lib/express.js",
      type: "hierarchyEdge",
    },
    {
      id: "e-file-dir:lib-file:lib/application.js",
      source: "dir:lib",
      target: "file:lib/application.js",
      type: "hierarchyEdge",
    },
  ],
  stats: {
    total_files: 2,
    total_directories: 1,
    max_depth: 2,
    languages: { JavaScript: 2 },
  },
};

const dependencyData = {
  level: "modules",
  nodes: [
    {
      id: "mod:lib",
      type: "moduleNode",
      data: {
        name: "lib",
        file_count: 2,
        total_lines: 200,
        languages: ["JavaScript"],
        architectural_role: "Core Library",
        incoming_count: 0,
        outgoing_count: 1,
      },
    },
  ],
  edges: [],
  canonical_metrics: {
    indexed_files_count: 2,
    functions_count: 8,
    classes_count: 2,
    direct_imports_count: 1,
    call_relationships_count: 2,
    inherits_relationships_count: 0,
    api_relationships_count: 0,
    data_access_relationships_count: 0,
    total_relationships_count: 3,
    isolated_files_count: 0,
  },
};

const featureFlowData = {
  stages: [
    {
      stage_number: 1,
      title: "Application Entry & Initialization",
      component: "lib/express.js",
      role: "Entry Point",
      function_or_symbol: "createApplication",
      description: "Incoming HTTP request arrives at express.js",
      input_spec: "HTTP Request",
      output_spec: "Application Context",
      code_reference: {
        file_path: "lib/express.js",
        start_line: 1,
        end_line: 10,
        snippet: "exports = module.exports = createApplication;",
      },
      is_error_stage: false,
    },
  ],
  preset_scenarios: [
    "Request Routing & Handling",
    "Middleware Pipeline Execution",
    "JSON Response Generation",
    "Error Handling & Fallback",
    "Application Initialization",
  ],
  nodes: [
    {
      id: "stage-1",
      position: { x: 80, y: 150 },
      data: {
        stage_number: 1,
        title: "Application Entry & Initialization",
        component: "lib/express.js",
        role: "Entry Point",
        function_or_symbol: "createApplication",
        description: "Incoming HTTP request arrives at express.js",
        input_spec: "HTTP Request",
        output_spec: "Application Context",
        is_error_stage: false,
      },
    },
  ],
  edges: [],
  inference_meta: {
    method: "Deterministic AST Call Graph",
    accuracy_notice: "Verified with static parser",
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
  ],
  links: [],
  meta: {
    total_nodes: 2,
    total_links: 0,
    directories: 1,
    files: 1,
    symbols: 0,
    physics_profile: {
      repulsion: -280,
      spring_length: 65,
      collision_radius: 36,
      damping: 0.88,
    },
  },
};

async function mockApis(page: any) {
  await page.route("**/api/repos/1", async (route: any) => {
    await route.fulfill({ json: repo });
  });

  await page.route("**/api/architecture/project-structure/1", async (route: any) => {
    await route.fulfill({ json: structure });
  });

  await page.route("**/api/architecture/dependency-map/1*", async (route: any) => {
    await route.fulfill({ json: dependencyData });
  });

  await page.route("**/api/architecture/feature-flow", async (route: any) => {
    await route.fulfill({ json: featureFlowData });
  });

  await page.route("**/api/architecture/obsidian/1", async (route: any) => {
    await route.fulfill({ json: obsidianData });
  });
}

test.describe("Architecture 4-View Suite & GitDiagram Hierarchy", () => {
  test("keeps the four existing views alongside Neural Map", async ({ page }) => {
    await mockApis(page);
    await page.goto("/workspace/1/architecture");

    await expect(page.getByRole("button", { name: "Neural Map", exact: true })).toBeVisible();

    // Check top navigation tabs
    await expect(page.getByRole("button", { name: /Obsidian Cosmos/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hierarchy" })).toBeVisible();


    await expect(page.getByRole("button", { name: "Repository Map" })).toBeVisible();
  });

  test("hierarchy view presents GitDiagram format with Diagram, Canvas, and Mermaid Code", async ({ page }) => {
    await mockApis(page);
    await page.goto("/workspace/1/architecture");

    // Switch to Hierarchy
    await page.getByRole("button", { name: "Hierarchy" }).click();

    // Verify GitDiagram mode toggle buttons
    await expect(page.getByRole("button", { name: "Diagram", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Canvas", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mermaid Code", exact: true })).toBeVisible();

    // Verify Copy Mermaid button
    await expect(page.getByRole("button", { name: "Copy Mermaid" })).toBeVisible();

    // Switch to Mermaid Code view
    await page.getByRole("button", { name: "Mermaid Code", exact: true }).click();
    await expect(page.getByText("architecture.mmd")).toBeVisible();
    await expect(page.getByText("flowchart TD")).toBeVisible();
    await expect(page.getByText("subgraph n_root")).toBeVisible();

    // Switch to Canvas view
    await page.getByRole("button", { name: "Canvas", exact: true }).click();
    await expect(page.locator(".react-flow")).toBeVisible();
  });

  test("keeps the restored Repository Map and removed tabs match main", async ({ page }) => {
    await mockApis(page);
    await page.goto("/workspace/1/architecture");
    await expect(page.getByRole("button", { name: "Repository Map", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dependency Map", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Feature Flow", exact: true })).toHaveCount(0);
  });
});
