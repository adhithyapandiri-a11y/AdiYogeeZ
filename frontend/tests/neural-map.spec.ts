import { test, expect } from "@playwright/test";
import preview from "../src/components/neural/preview.json";
import {
  prepareGraph,
  visibleGraph,
  NODE_LIMIT,
} from "../src/components/neural/model";
import type { ObsidianGraphData } from "../src/lib/types";
const repo = {
  id: 8,
  owner: "test",
  name: "project",
  indexing_status: "completed",
  progress_percent: 100,
  file_count: 2,
  function_count: 1,
  dependency_count: 1,
  github_url: "https://github.com/test/project",
};
async function api(page: import("@playwright/test").Page) {
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/repos/connect"))
      return route.fulfill({ json: { repo_id: 8, status: "already_indexed" } });
    if (path.endsWith("/repos")) return route.fulfill({ json: [] });
    if (path.includes("/obsidian/")) return route.fulfill({ json: preview });
    if (path.includes("/node-details/"))
      return route.fulfill({ status: 503, json: { detail: "Unavailable" } });
    return route.fulfill({ json: repo });
  });
}
test("only indexed dependencies, complete ancestry and bounded rendering", () => {
  const data = {
    nodes: Array.from({ length: NODE_LIMIT + 20 }, (_, i) => ({
      id: `file:${i}`,
      path: `src/f${i}.ts`,
      name: `f${i}.ts`,
      type: "file",
      size: 8,
      color: "",
    })),
    links: [
      { source: "file:0", target: "file:1", type: "imports", value: 1 },
      { source: "file:0", target: "missing", type: "imports", value: 1 },
    ],
    stats: {},
  } as ObsidianGraphData;
  const graph = prepareGraph(data);
  expect(graph.nodes.find((n) => n.path === "src")?.type).toBe("directory");
  expect(graph.links.filter((l) => l.type === "imports")).toHaveLength(1);
  const view = visibleGraph(graph, new Set(), "src/f369.ts", "all", "all");
  expect(view.nodes).toHaveLength(NODE_LIMIT);
  expect(view.nodes.some((n) => n.path === "src/f369.ts")).toBe(true);
  expect(
    visibleGraph(graph, new Set(["src"]), null, "all", "all").nodes,
  ).toHaveLength(1);
});
test("homepage validates URLs and opens the indexed neural workspace", async ({
  page,
}) => {
  await api(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Understand any codebase." }),
  ).toBeVisible();
  await page
    .getByLabel("GitHub repository URL")
    .fill("https://example.com/test/project");
  await page
    .getByRole("button", { name: "Explore Repository", exact: true })
    .click();
  await expect(page.locator("#repo-error")).toContainText("Enter a GitHub");
  await page
    .getByLabel("GitHub repository URL")
    .fill("https://github.com/test/project");
  await page.getByLabel("GitHub repository URL").press("Enter");
  await expect(page).toHaveURL("/workspace/8/architecture");
  await expect(
    page.getByRole("button", { name: "Neural Map", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Obsidian Cosmos", exact: true }),
  ).toBeVisible();
});
test("file search, folder collapse, filters, canvas and mobile layout", async ({
  page,
}, testInfo) => {
  await api(page);
  await page.goto("/");
  await expect(page.locator(".neural-canvas canvas")).toBeVisible({
    timeout: 60000,
  });
  await page
    .getByLabel("Search files and folders")
    .fill("frontend/src/app/page.tsx");
  await page
    .getByRole("button", { name: "frontend/src/app/page.tsx", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "frontend/src/app/page.tsx",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "true");
  await page.getByLabel("Search files and folders").fill("");
  await page.getByRole("button", { name: "Collapse all", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Expand frontend", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Relationship types").selectOption("dependencies");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await page.reload();
  await expect(page.locator(".neural-canvas canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  if (process.env.REPOMIND_CAPTURE_SCREENSHOTS)
    await page.screenshot({
      path: testInfo.outputPath("desktop.png"),
      fullPage: true,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Hide file explorer" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await page.waitForTimeout(700);
  if (process.env.REPOMIND_CAPTURE_SCREENSHOTS)
    await page.screenshot({
      path: testInfo.outputPath("mobile.png"),
      fullPage: true,
    });
});
test("indexing shows server progress and a recoverable failure", async ({
  page,
}) => {
  await api(page);
  await page.route("**/api/repos/connect", (r) =>
    r.fulfill({ json: { repo_id: 8, status: "indexing" } }),
  );
  await page.route("**/api/repos/8", (r) =>
    r.fulfill({
      json: {
        ...repo,
        indexing_status: "failed",
        progress_percent: 32,
        status_message: "Repository indexing failed. Retry this repository.",
      },
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("GitHub repository URL")
    .fill("https://github.com/test/project");
  await page.getByLabel("GitHub repository URL").press("Enter");
  await expect(page.locator("#repo-error")).toContainText(
    "Repository indexing failed",
  );
  await expect(
    page.getByRole("button", { name: "Explore Repository", exact: true }),
  ).toBeEnabled();
});

test("WebGL fallback keeps file navigation usable", async ({ page }) => {
  await api(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByText("3D rendering is unavailable")).toBeVisible();
  await page
    .getByLabel("Search files and folders")
    .fill("frontend/src/app/page.tsx");
  await page
    .getByRole("button", { name: "frontend/src/app/page.tsx", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "frontend/src/app/page.tsx",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "true");
});

test("workspace file selection opens the existing inspector", async ({
  page,
}) => {
  await api(page);
  await page.goto("/workspace/8/architecture");
  await page
    .getByLabel("Search files and folders")
    .fill("frontend/src/app/page.tsx");
  const file = page.getByRole("button", {
    name: "frontend/src/app/page.tsx",
    exact: true,
  });
  await file.click();
  await expect(file).toHaveAttribute("aria-current", "true");
  await expect(page.getByText("Failed to fetch node details")).toBeVisible();
  await page.getByRole("button", { name: "Close file inspector" }).click();
  await expect(file).not.toHaveAttribute("aria-current", "true");
});
