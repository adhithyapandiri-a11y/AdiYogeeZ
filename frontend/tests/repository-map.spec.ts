import { test, expect, type Page } from "@playwright/test";
import { toMapRepository } from "../src/components/architecture/repository-map/adapter";
import {
  ROOT,
  visibleEntries,
} from "../src/components/architecture/repository-map/model";
import type { ProjectStructureResponse, Repository } from "../src/lib/types";
const repo: Repository = {
  id: 1,
  owner: "test",
  name: "orbit",
  github_url: "https://github.com/test/orbit",
  default_branch: "main",
  primary_language: "TypeScript",
  description: "Test indexed repository",
  stars: 0,
  forks: 0,
  indexing_status: "completed",
  progress_percent: 100,
  file_count: 4,
  function_count: 1,
  class_count: 0,
  dependency_count: 0,
  module_count: 2,
};
const paths = [
  "README.md",
  "docs/README.md",
  "src/components/ui/Button.tsx",
  "src/App.tsx",
];
const fileData = (path: string) => ({
  name: path.split("/").pop()!,
  raw_name: path.split("/").pop()!,
  file_path: path,
  language: "TypeScript",
  color: "#80b9f8",
  architectural_role: "UI Component",
  role_color: "#80b9f8",
  line_count: 1,
  file_size: 50,
  function_count: 1,
  class_count: 0,
  incoming_count: 0,
  outgoing_count: 0,
});
const structure: ProjectStructureResponse = {
  nodes: [
    {
      id: "dir:root",
      type: "directoryNode",
      data: {
        name: "Repository Root",
        path: "",
        is_root: true,
        file_count: 4,
        folder_count: 2,
        languages: ["TypeScript"],
        architectural_role: "Root Workspace",
        depth: 0,
      },
    },
    ...paths.map((path) => ({
      id: `file:${path}`,
      type: "fileNode",
      data: fileData(path),
    })),
  ],
  edges: [],
  stats: {
    total_files: 4,
    total_directories: 5,
    max_depth: 4,
    languages: { TypeScript: 4 },
  },
};
const source = (path: string) =>
  `// ${path}\nexport const value = "<script>alert(1)</script>";`;
async function mockApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = {};
    if (url.pathname.endsWith("/repos")) body = [repo];
    else if (url.pathname.endsWith("/repos/1")) body = repo;
    else if (url.pathname.includes("/project-structure/")) body = structure;
    else if (url.pathname.includes("/node-details/")) {
      const path = url.searchParams.get("path")!;
      body = {
        file_path: path,
        language: "TypeScript",
        line_count: 2,
        file_size: 50,
        preview: source(path),
        functions: [],
        classes: [],
        incoming_dependencies: [],
        outgoing_dependencies: [],
      };
    } else if (url.pathname.endsWith("/file-content")) {
      const path = url.searchParams.get("path")!;
      body = {
        file_path: path,
        language: "TypeScript",
        content: source(path),
        line_count: 2,
        symbols: [],
      };
    }
    await route.fulfill({ json: body });
  });
}
async function reveal(page: Page, path: string) {
  const input = page.getByRole("combobox", { name: "Search repository map" });
  await input.fill(path);
  await expect(page.getByRole("option").first()).toBeVisible();
  await input.press("Enter");
}
test("adapter restores exact paths and missing ancestor folders, view limit preserves selection", () => {
  const map = toMapRepository(structure, 1, repo);
  expect(
    map.entries.find((e) => e.path === "src/components/ui/Button.tsx")?.parent,
  ).toBe("src/components/ui");
  expect(map.entries.find((e) => e.path === "src/components")?.kind).toBe(
    "folder",
  );
  expect(map.entries.some((e) => e.path === "Repository Root")).toBe(false);
  const entries = [
    ...Array.from({ length: 400 }, (_, i) => ({
      path: `${i}.ts`,
      name: `${i}.ts`,
      parent: ROOT,
      kind: "file" as const,
    })),
    ...map.entries,
  ];
  const visible = visibleEntries(
    entries,
    new Set([ROOT, "src", "src/components", "src/components/ui"]),
    "src/components/ui/Button.tsx",
  );
  expect(visible.entries).toHaveLength(299);
  expect(
    visible.entries.some((e) => e.path === "src/components/ui/Button.tsx"),
  ).toBe(true);
});
test("map defaults to graph, collapsed search reveals source and duplicates keep full paths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockApi(page);
  await page.goto("/workspace/1/architecture");
  await expect(
    page.getByRole("button", { name: "Repository Map", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator('[aria-label^="Interactive folder"] canvas').first(),
  ).toBeVisible();
  await reveal(page, "Button.tsx");
  await expect(
    page.getByRole("complementary", { name: "File inspector" }),
  ).toContainText("src/components/ui/Button.tsx");
  await expect(
    page.getByRole("button", {
      name: "Collapse src/components/ui",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Source preview of src/components/ui/Button.tsx"),
  ).toContainText("<script>alert(1)</script>");
  await expect(
    page.locator('[aria-label="File inspector"] script'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close file inspector" }).click();
  await reveal(page, "docs/README.md");
  await expect(
    page.getByRole("complementary", { name: "File inspector" }),
  ).toContainText("docs/README.md");
  await page.getByRole("button", { name: "Open in Full Code Viewer" }).click();
  await expect(
    page.getByRole("dialog", { name: "Source of docs/README.md" }),
  ).toContainText("// docs/README.md");
  await page.getByRole("button", { name: "Close source viewer" }).press("Tab");
  await expect(
    page.getByRole("button", { name: "Copy Code", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Copy Code", exact: true })
    .press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Source of docs/README.md" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("keyboard no results, folder controls, zoom, hierarchy fallback and screenshots", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockApi(page);
  await page.goto("/workspace/1/architecture");
  await reveal(page, "src/App.tsx");
  await page.getByRole("button", { name: "Close file inspector" }).click();
  await page.getByRole("button", { name: "Collapse all", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Expand src", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand src", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Collapse src", exact: true }),
  ).toBeVisible();
  const search = page.getByRole("combobox", { name: "Search repository map" });
  await search.fill("nothing-matches");
  await expect(
    page.getByText("No files match", { exact: false }),
  ).toBeVisible();
  await search.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Fit graph to view" }).click();
  await page.screenshot({ path: "test-results/repository-map-desktop.png" });
  await page.getByRole("button", { name: "Hierarchy", exact: true }).click();
  await expect(page.locator(".react-flow")).toBeVisible();
  await page
    .getByRole("button", { name: "Repository Map", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Show map explorer" }).click();
  await expect(
    page.getByRole("navigation", { name: "Map files" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide map explorer" }).click();
  await reveal(page, "src/App.tsx");
  await expect(
    page.getByRole("complementary", { name: "File inspector" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/repository-map-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("map fetch and inspector errors offer working retries", async ({
  page,
}) => {
  await mockApi(page);
  let fail = true;
  await page.route("**/project-structure/1", (route) =>
    route.fulfill(
      fail ? { status: 500, json: { detail: "error" } } : { json: structure },
    ),
  );
  await page.goto("/workspace/1/architecture");
  await expect(
    page.getByRole("alert").filter({ hasText: "Failed to fetch" }),
  ).toContainText("Failed to fetch project structure");
  fail = false;
  await page.getByRole("button", { name: "Retry map" }).click();
  let sourceFail = true;
  await page.route("**/node-details/1?*", (route) =>
    route.fulfill(
      sourceFail
        ? { status: 500, json: { detail: "error" } }
        : {
            json: {
              file_path: "src/App.tsx",
              language: "Markdown",
              line_count: 1,
              file_size: 5,
              preview: "# Retry works",
              functions: [],
              classes: [],
              incoming_dependencies: [],
              outgoing_dependencies: [],
            },
          },
    ),
  );
  await reveal(page, "src/App.tsx");
  await expect(
    page.getByRole("alert").filter({ hasText: "Failed to fetch" }),
  ).toContainText("Failed to fetch node details");
  sourceFail = false;
  await page.getByRole("button", { name: "Retry file details" }).click();
  await expect(page.getByLabel("Source preview of src/App.tsx")).toContainText(
    "Retry works",
  );
});
