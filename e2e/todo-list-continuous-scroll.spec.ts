import { test, expect } from "@playwright/test";

test("rendered TodoList continuously loads 5,000 tasks without page controls", async ({ page }) => {
  const requests: string[] = [];
  const records = Array.from({ length: 5000 }, (_, index) => ({
    id: `task-${index}`,
    table_id: "table-a",
    values: { title: `Task ${index}` },
  }));
  const otherTenantRecords = [{ id: "tenant-b-task", table_id: "table-b", values: { title: "Tenant B private" } }];

  await page.addInitScript(() => {
    localStorage.setItem("token", "playwright-isolated-token");
    localStorage.setItem("user", JSON.stringify({ id: "user-a", name: "E2E User" }));
  });
  await page.route("**/api/tables", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([
      { id: "table-a", name: "Tenant A", columns: [{ id: "title", name: "Title", type: "Text" }] },
      { id: "table-b", name: "Tenant B", columns: [{ id: "title", name: "Title", type: "Text" }] },
    ]) });
  });
  await page.route("**/api/tables/table-*/tasks**", async (route) => {
    const url = new URL(route.request().url());
    const tableId = url.pathname.includes("table-b") ? "table-b" : "table-a";
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Number(url.searchParams.get("limit") || 100);
    requests.push(`${tableId}:${offset}:${limit}`);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify((tableId === "table-b" ? otherTenantRecords : records).slice(offset, offset + limit)) });
  });
  await page.route("**/api/**", async (route) => {
    if (route.request().url().includes("/api/tables")) return route.continue();
    if (route.request().method() === "GET") return route.fulfill({ contentType: "application/json", body: JSON.stringify([]) });
    return route.continue();
  });

  await page.goto("/workspace");
  await expect(page.getByText("Tables").first()).toBeVisible();
  await expect(page.getByText("Task 0")).toBeVisible();
  expect(await page.getByRole("button", { name: /Previous|Next/ }).count()).toBe(0);

  const scrollHost = page.locator("main").first();
  for (let i = 0; i < 60 && !(await page.getByText("Task 4999").count()); i += 1) {
    await scrollHost.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.waitForTimeout(25);
  }
  await expect(page.getByText("Task 4999")).toHaveCount(1);
  expect(requests.filter((request) => request.startsWith("table-a:")).length).toBe(50);
  expect(new Set(requests).size).toBe(requests.length);
  await page.getByRole("tab", { name: "Tenant B" }).click();
  await expect(page.getByText("Tenant B private")).toBeVisible();
  await expect(page.getByText("Task 0")).toHaveCount(0);
});
