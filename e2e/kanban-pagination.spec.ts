import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";

const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;
const databaseUrl = process.env.DATABASE_URL || "";
const isolated = process.env.KANBAN_E2E_ISOLATED === "1";
const sizes = [50, 100, 101, 500, 1100];

function assertLocalDatabase(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!(host === "localhost" || host === "127.0.0.1" || host === "::1") || !/kanban|acceptance|test/i.test(database)) {
    throw new Error("Kanban E2E requires a local PostgreSQL database named for testing");
  }
}

async function login(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL });
  const response = await context.request.post(`${baseURL}/api/login/`, {
    data: { email: "portal-manager-v2@smartmanage-demo.com", password },
    headers: { Origin: baseURL },
  });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  await context.setExtraHTTPHeaders({ Authorization: `Bearer ${body.token}` });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }, { token: body.token, user: body.user });
  return { context, userId: String(body.user.id) };
}

async function seedBoard(userId: string, size: number) {
  assertLocalDatabase(databaseUrl);
  const client = new pg.Client({ connectionString: databaseUrl, ssl: false });
  await client.connect();
  const workspaceId = randomUUID();
  const tableId = randomUUID();
  const nameColumn = randomUUID();
  const statusColumn = randomUUID();
  const marker = `KANBAN_E2E_${size}_${Date.now()}`;
  const columns = [
    { id: nameColumn, name: "Name", type: "Text", order: 0 },
    { id: statusColumn, name: "Status", type: "Status", order: 1, options: [
      { value: "Open", color: "#1976d2" }, { value: "Done", color: "#00c875" },
    ] },
  ];
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO workspaces(id,name,owner_id,is_demo,demo_expires_at,demo_metadata) VALUES($1,$2,$3,TRUE,NOW()+INTERVAL '1 hour',$4::jsonb)",
      [workspaceId, `${marker} Workspace`, userId, JSON.stringify({ purpose: "kanban-pagination-e2e" })],
    );
    await client.query(
      `INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,job_roles,primary_job_role,portal_type,permitted_portals,landing_route,record_access,updated_at)
       VALUES($1,$2,'admin','admin','["manager"]'::jsonb,'manager','manager','["manager"]'::jsonb,'/workspace','{"scope":"all"}'::jsonb,NOW())`,
      [workspaceId, userId],
    );
    await client.query("INSERT INTO tables(id,name,workspace_id,columns) VALUES($1,$2,$3,$4::jsonb)", [tableId, `${marker} Board`, workspaceId, JSON.stringify(columns)]);
    await client.query("INSERT INTO board_member_access(table_id,user_id,board_role,capabilities,record_access,updated_at) VALUES($1,$2,'owner','{}'::jsonb,'{\"scope\":\"all\"}'::jsonb,NOW())", [tableId, userId]);
    const values: unknown[] = [];
    const rows: string[] = [];
    for (let i = 0; i < size; i += 1) {
      rows.push(`($${values.length + 1},$${values.length + 2},$${values.length + 3}::jsonb,$${values.length + 4},NOW(),NOW())`);
      values.push(randomUUID(), tableId, JSON.stringify({ [nameColumn]: `${marker} Task ${String(i + 1).padStart(4, "0")}`, [statusColumn]: i % 2 ? "Done" : "Open" }), userId);
    }
    await client.query(`INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) VALUES ${rows.join(",")}`, values);
    await client.query("COMMIT");
    return { client, workspaceId, tableId, boardName: `${marker} Board`, marker };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end();
    throw error;
  }
}

async function chooseKanban(page: Page, boardName: string) {
  await page.getByText(boardName, { exact: true }).click();
  const newTask = page.getByRole("button", { name: "New task" });
  await expect(newTask).toBeVisible({ timeout: 30_000 });
  await newTask.locator("xpath=preceding-sibling::button[1]").click();
  await page.getByRole("menu").getByText("Kanban", { exact: true }).click();
  await expect(page.locator('[data-rfd-droppable-id^="kanban:"]').first()).toBeVisible({ timeout: 30_000 });
}

async function loadedTasks(page: Page, marker: string) {
  return page.getByText(new RegExp(`^${marker} Task \\d{4}$`)).count();
}

async function statusCount(page: Page, status: string) {
  return Number(await page.getByTestId(`kanban-count-${status}`).innerText());
}

test.describe("Kanban progressive pagination (isolated PostgreSQL)", () => {
  test.setTimeout(240_000);
  test.skip(!password || !isolated || !databaseUrl, "Requires the isolated Kanban PostgreSQL workflow");

  test("loads every fixture size on demand and measures browser idle traffic", async ({ browser, baseURL }) => {
    test.skip(test.info().project.name !== "desktop-1440", "Focused desktop functional flow");
    assertLocalDatabase(databaseUrl);
    const { context, userId } = await login(browser, baseURL!);
    const pages: Page[] = [];
    try {
      for (const size of sizes) {
        const fixture = await seedBoard(userId, size);
        const page = await context.newPage();
        pages.push(page);
        const taskRequests: string[] = [];
        page.on("request", request => {
          if (request.method() === "GET" && request.url().includes(`/tables/${fixture.tableId}/tasks`)) taskRequests.push(request.url());
        });
        await page.goto(`/workspace/?id=${fixture.workspaceId}`);
        await chooseKanban(page, fixture.boardName);
        await expect.poll(() => loadedTasks(page, fixture.marker), { timeout: 30_000 }).toBe(Math.min(100, size));
        await expect.poll(() => statusCount(page, "Open"), { timeout: 30_000 }).toBe(Math.ceil(size / 2));
        await expect.poll(() => statusCount(page, "Done"), { timeout: 30_000 }).toBe(Math.floor(size / 2));
        const initialRequests = taskRequests.length;
        expect(initialRequests).toBeGreaterThan(0);

        if (size === 101) {
          let failedOnce = false;
          let failedRequests = 0;
          let successfulRetryRequests = 0;
          await page.route(`**/api/tables/${fixture.tableId}/tasks**`, async route => {
            if (!failedOnce) { failedOnce = true; failedRequests += 1; await route.abort("connectionreset"); return; }
            successfulRetryRequests += 1;
            await route.continue();
          });
          await page.getByRole("button", { name: "Load more" }).first().click();
          await expect(page.getByRole("button", { name: "Retry" }).first()).toBeVisible({ timeout: 10_000 });
          await page.getByRole("button", { name: "Retry" }).first().click();
          await expect.poll(() => loadedTasks(page, fixture.marker), { timeout: 30_000 }).toBe(size);
          expect(failedRequests).toBe(1);
          expect(successfulRetryRequests).toBe(1);
          await page.unroute(`**/api/tables/${fixture.tableId}/tasks**`);
        }

        while (await page.getByRole("button", { name: "Load more" }).count()) {
          const before = await loadedTasks(page, fixture.marker);
          const column = page.locator('[data-rfd-droppable-id^="kanban:"]').first();
          await column.evaluate((element) => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event("scroll", { bubbles: true })); });
          await page.getByRole("button", { name: "Load more" }).first().click();
          await expect.poll(() => loadedTasks(page, fixture.marker), { timeout: 30_000 }).toBeGreaterThan(before);
        }
        await expect.poll(() => loadedTasks(page, fixture.marker), { timeout: 60_000 }).toBe(size);
        expect(taskRequests.length - initialRequests).toBe(Math.ceil(Math.max(0, size - 100) / 100));

        const beforeIdle = taskRequests.length;
        await page.waitForTimeout(10_000);
        expect(taskRequests.length).toBe(beforeIdle);

        if (size === 101) {
          await page.getByText(fixture.boardName, { exact: true }).click();
          await expect(page.getByText(`${fixture.marker} Task 0101`, { exact: true })).toBeVisible();
        }
        await fixture.client.query("DELETE FROM workspaces WHERE id=$1", [fixture.workspaceId]);
        await fixture.client.end();
        await page.close();
      }
    } finally {
      for (const page of pages) await page.close().catch(() => undefined);
      await context.close();
    }
  });
});
