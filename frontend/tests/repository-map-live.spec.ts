import { test, expect } from "@playwright/test";
test("@live indexed FastAPI repository opens map and real source", async ({
  page,
  request,
}) => {
  const id = process.env.REPOMIND_LIVE_REPO_ID;
  test.skip(
    !id,
    "Set REPOMIND_LIVE_REPO_ID to a completed indexed repository.",
  );
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";
  const response = await request.get(`${api}/repos/${id}`);
  expect(response.ok()).toBe(true);
  expect((await response.json()).indexing_status).toBe("completed");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/workspace/${id}/architecture`);
  await expect(
    page.locator('[aria-label^="Interactive folder"] canvas').first(),
  ).toBeVisible();
  const search = page.getByRole("combobox", { name: "Search repository map" });
  await search.fill("frontend/src/app/page.tsx");
  await expect(page.getByRole("option").first()).toBeVisible();
  await search.press("Enter");
  await expect(
    page.getByLabel("Source preview of frontend/src/app/page.tsx"),
  ).toContainText("use client");
  await page.screenshot({ path: "test-results/real-repository-map.png" });
  await page.getByRole("button", { name: "Open in Full Code Viewer" }).click();
  await expect(
    page.getByRole("dialog", { name: "Source of frontend/src/app/page.tsx" }),
  ).toContainText("import");
});
