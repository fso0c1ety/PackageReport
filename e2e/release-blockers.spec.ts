import { expect, test, type Browser } from "@playwright/test";
import { randomUUID } from "node:crypto";

const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;

async function login(browser: Browser, baseURL: string, email = "portal-manager@smartmanage-demo.com") {
  const context = await browser.newContext({ baseURL });
  const response = await context.request.post(`${baseURL}/api/login/`, { data: { email, password }, headers: { Origin: baseURL } });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  await context.setExtraHTTPHeaders({ Authorization: `Bearer ${body.token}` });
  await context.addInitScript(({ token, user }) => { localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify(user)); }, { token: body.token, user: body.user });
  return context;
}

test.describe("final release blocker smoke", () => {
  test.setTimeout(180_000);
  test.skip(!password, "SMART_MANAGE_PORTAL_TEST_PASSWORD is required");

  test("core workspace CRUD, views, file, search and tenant isolation", async ({ browser, baseURL }, testInfo) => {
    test.skip(!["desktop-1440", "pixel-7"].includes(testInfo.project.name), "Representative desktop and Pixel 7 flow only");
    const owner = await login(browser, baseURL!);
    const restricted = await login(browser, baseURL!, "driver-b@smartmanage-demo.com");
    let workspaceId = "";
    try {
      const suffix = `${testInfo.project.name}-${Date.now()}`;
      const workspaceResponse = await owner.request.post(`${baseURL}/api/workspaces/`, { data: { name: `Release Smoke ${suffix}`, templateKey: "blank", includeSampleData: false } });
      const workspace = await workspaceResponse.json();
      expect(workspaceResponse.status(), JSON.stringify(workspace)).toBe(200);
      workspaceId = workspace.id;
      const renamed = await owner.request.put(`${baseURL}/api/workspaces/${workspaceId}`, { data: { name: `Release Verified ${suffix}` } });
      expect(renamed.status()).toBe(200);

      const columns = [
        { id: randomUUID(), name: "Name", type: "Text", order: 0 },
        { id: randomUUID(), name: "Amount", type: "Numbers", order: 1 },
        { id: randomUUID(), name: "Status", type: "Status", order: 2, options: [{ value: "Open", color: "#1976d2" }, { value: "Done", color: "#00c875" }] },
        { id: randomUUID(), name: "Due Date", type: "Date", order: 3 },
        { id: randomUUID(), name: "File", type: "Files", order: 4 },
      ];
      const tableResponse = await owner.request.post(`${baseURL}/api/tables/`, { data: { workspaceId, name: "Release Board", columns } });
      const table = await tableResponse.json();
      expect(tableResponse.status(), JSON.stringify(table)).toBe(200);
      expect((await owner.request.patch(`${baseURL}/api/tables/${table.id}`, { data: { name: "Release Board Verified" } })).status()).toBe(200);

      const rowValues = { [columns[0].id]: `Unique Record ${suffix}`, [columns[1].id]: 42.5, [columns[2].id]: "Open", [columns[3].id]: "2026-08-20", [columns[4].id]: [] };
      const rowResponse = await owner.request.post(`${baseURL}/api/tables/${table.id}/tasks`, { data: { values: rowValues } });
      const row = await rowResponse.json();
      expect(rowResponse.status(), JSON.stringify(row)).toBe(201);
      rowValues[columns[1].id] = 99.25;
      rowValues[columns[2].id] = "Done";
      expect((await owner.request.put(`${baseURL}/api/tables/${table.id}/tasks`, { data: { id: row.id, values: rowValues } })).status()).toBe(200);
      expect((await owner.request.post(`${baseURL}/api/tables/${table.id}/tasks`, { data: { values: { ...rowValues, [columns[0].id]: `Second ${suffix}`, [columns[1].id]: 7 } } })).status()).toBe(201);
      expect((await owner.request.post(`${baseURL}/api/tables/${table.id}/chat`, { data: { text: "Release smoke comment" } })).status()).toBe(200);

      expect((await restricted.request.get(`${baseURL}/api/workspaces/${workspaceId}`)).status()).toBe(403);
      expect((await restricted.request.get(`${baseURL}/api/tables/${table.id}/tasks`)).status()).toBe(404);

      const page = await owner.newPage();
      await page.goto(`/workspace/?id=${workspaceId}`);
      const boardTab = page.getByText("Release Board Verified", { exact: true });
      await expect(boardTab).toBeVisible({ timeout: 30_000 });
      await boardTab.click();
      await expect(page.getByText(`Unique Record ${suffix}`, { exact: true })).toBeVisible();
      await page.reload();
      await page.getByText("Release Board Verified", { exact: true }).click();
      await expect(page.getByText("99.25", { exact: true })).toBeVisible();
      const search = page.getByPlaceholder("Search tasks...");
      await search.fill(`Unique Record ${suffix}`);
      await expect(page.getByText(`Second ${suffix}`, { exact: true })).toBeHidden();
      await search.fill("");
      if (testInfo.project.name === "desktop-1440") {
        const viewButton = page.getByRole("button", { name: "New task" }).locator("xpath=preceding-sibling::button[1]");
        await viewButton.click();
        await page.getByText("Kanban", { exact: true }).click();
        await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
        await viewButton.click();
        await page.getByRole("menu").getByText("Calendar", { exact: true }).click();
        await expect(page.locator("body")).toContainText(/August|2026|20/);
        await viewButton.click();
        await page.getByText("Table view", { exact: true }).click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
    } finally {
      if (workspaceId) expect((await owner.request.delete(`${baseURL}/api/workspaces/${workspaceId}`)).status()).toBe(200);
      await owner.close();
      await restricted.close();
    }
  });

  test("calendar preserves deterministic date across edit, navigation and refresh", async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "Focused desktop calendar smoke");
    const context = await login(browser, baseURL!);
    let eventId = "";
    try {
      const created = await context.request.post(`${baseURL}/api/calendar-events/`, { data: { title: "Release Calendar 2026-08-20", startsAt: "2026-08-20T12:00:00.000Z", endsAt: "2026-08-20T13:00:00.000Z" } });
      const event = await created.json();
      expect(created.status(), JSON.stringify(event)).toBe(201);
      eventId = event.id;
      const edited = await context.request.put(`${baseURL}/api/calendar-events/`, { data: { id: eventId, title: "Release Calendar Verified", startsAt: "2026-08-20T12:00:00.000Z", endsAt: "2026-08-20T13:00:00.000Z" } });
      expect(edited.status()).toBe(200);
      expect((await edited.json()).starts_at.slice(0, 10)).toBe("2026-08-20");
      const page = await context.newPage();
      await page.goto("/calendar/");
      await expect(page.getByText("Release Calendar Verified", { exact: true })).toBeVisible({ timeout: 30_000 });
      const buttons = page.getByRole("button");
      const count = await buttons.count();
      expect(count).toBeGreaterThan(2);
      await buttons.nth(1).click();
      await buttons.nth(0).click();
      await page.reload();
      const fetched = await context.request.get(`${baseURL}/api/calendar-events/`);
      const persisted = (await fetched.json()).find((item: { id: string }) => item.id === eventId);
      expect(persisted.starts_at.slice(0, 10)).toBe("2026-08-20");
      await expect(page.locator("body")).not.toContainText(/failed to load|unable to load/i);
    } finally {
      if (eventId) await context.request.delete(`${baseURL}/api/calendar-events/?id=${eventId}`);
      await context.close();
    }
  });

  test("accessibility and performance smoke has no release-level failure", async ({ page }, testInfo) => {
    test.skip(!["desktop-1440", "pixel-7"].includes(testInfo.project.name), "Representative screens only");
    for (const route of ["/", "/login/", "/#request-demo"]) {
      await page.goto(route);
      if (testInfo.project.name === "desktop-1440") {
        for (let attempt = 0; attempt < 8 && await page.evaluate(() => document.activeElement === document.body); attempt += 1) await page.keyboard.press("Tab");
        expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
      }
      const unnamedButtons = await page.locator("button:not([aria-label])").evaluateAll((buttons) => buttons.filter((button) => !(button.textContent || "").trim() && !button.getAttribute("title")).length);
      expect(unnamedButtons).toBe(0);
      const metrics = await page.evaluate(() => ({ resources: performance.getEntriesByType("resource").length, scripts: performance.getEntriesByType("resource").filter((entry) => entry.name.includes(".js")).length, width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(metrics.resources).toBeLessThan(250);
      expect(metrics.scripts).toBeLessThan(100);
      expect(metrics.width).toBeLessThanOrEqual(metrics.viewport + 2);
    }
  });
});
