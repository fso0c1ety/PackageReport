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
  const viewMenu = page.getByRole("menu");
  await viewMenu.getByText("Kanban", { exact: true }).click();
  await expect(viewMenu).toBeHidden({ timeout: 5_000 });
  await expect(page.locator(".MuiPopover-root.MuiMenu-root")).toHaveCount(0, { timeout: 5_000 });
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

  for (const size of sizes) {
    test(`${size} tasks: progressive pagination, retry and idle traffic`, async ({ browser, baseURL }) => {
    test.skip(test.info().project.name !== "desktop-1440", "Focused desktop functional flow");
    assertLocalDatabase(databaseUrl);
    const { context, userId } = await login(browser, baseURL!);
    const fixture = await seedBoard(userId, size);
    const page = await context.newPage();
    try {
        const taskRequests: string[] = [];
        const responses: Array<{ scope: string; offset: number; limit: number; status: number; ids: string[]; total: number; hasMore: boolean; revision: string | null }> = [];
        const taskUrl = (url: string) => {
          try {
            const parsed = new URL(url);
            const pathname = parsed.pathname.replace(/\/+$/, "");
            return pathname === `/api/tables/${fixture.tableId}/tasks` ? parsed : null;
          } catch {
            return null;
          }
        };
        page.on("request", request => {
          const parsed = taskUrl(request.url());
          if (request.method() === "GET" && parsed) {
            taskRequests.push(request.url());
          }
        });
        page.on("response", response => {
          const parsed = taskUrl(response.url());
          if (parsed) {
            const offset = Number(parsed.searchParams.get("offset") || "0");
            if (response.status() >= 200 && response.status() < 300) {
              void response.json().then((body) => {
                const rows = Array.isArray(body) ? body : Array.isArray(body?.rows) ? body.rows : [];
                responses.push({
                  scope: parsed.searchParams.get("statusValue") || "__global__",
                  offset,
                  limit: Number(parsed.searchParams.get("limit") || "0"),
                  status: response.status(),
                  ids: rows.map((row: { id?: string }) => String(row.id || "")).filter(Boolean),
                  total: Number(body?.total || rows.length),
                  hasMore: Boolean(body?.hasMore),
                  revision: typeof body?.revision === "string" ? body.revision : null,
                });
              }).catch(() => undefined);
            }
          }
        });
        await page.goto(`/workspace/?id=${fixture.workspaceId}`);
        await chooseKanban(page, fixture.boardName);
        // The first request is a global status-column prefix. Column-scoped
        // pages are separate requests and must not be counted as the prefix.
        await expect.poll(
          () => responses.find((entry) => entry.scope === "__global__" && entry.offset === 0)?.ids.length || 0,
          { timeout: 30_000 },
        ).toBe(Math.min(100, size));
        await expect.poll(() => statusCount(page, "Open"), { timeout: 30_000 }).toBe(Math.ceil(size / 2));
        await expect.poll(() => statusCount(page, "Done"), { timeout: 30_000 }).toBe(Math.floor(size / 2));
        const initialRequests = taskRequests.length;
        expect(initialRequests).toBeGreaterThan(0);

        const scrollColumn = async (status: string) => {
          const column = page.locator(`[data-rfd-droppable-id="kanban:${status}"]`);
          for (let attempt = 0; attempt < 30; attempt += 1) {
            await column.evaluate((element) => { element.scrollTop = element.scrollHeight; });
            await page.waitForTimeout(150);
          }
        };
        if (size > 100) {
          await scrollColumn("Open");
          await scrollColumn("Done");
        }

        // Verify the response bodies, not just server totals: every fixture ID
        // must be observed and each scoped page must use the stable revision.
        await expect.poll(
          () => new Set(responses.flatMap((entry) => entry.ids)).size,
          { timeout: 60_000 },
        ).toBe(size);
        const scopedPages = responses.filter((entry) => entry.scope !== "__global__" && entry.offset >= 100);
        const expectedLargeScopes = [
          ["Open", Math.ceil(size / 2)],
          ["Done", Math.floor(size / 2)],
        ].filter(([, total]) => Number(total) > 100).map(([scope]) => scope);
        for (const scope of expectedLargeScopes) {
          expect(scopedPages.some((entry) => entry.scope === scope)).toBe(true);
        }
        expect(new Set(scopedPages.flatMap((entry) => entry.ids)).size).toBeGreaterThanOrEqual(Math.max(0, size - 100));
        for (const entry of responses.filter((candidate) => candidate.scope !== "__global__")) {
          expect(entry.limit).toBe(100);
          expect(entry.revision).toBeTruthy();
          expect(entry.total).toBe(entry.scope === "Open" ? Math.ceil(size / 2) : Math.floor(size / 2));
        }
        for (const scope of ["Open", "Done"]) {
          const scopeResponses = responses.filter((entry) => entry.scope === scope);
          const ordered = [...new Map(scopeResponses.map((entry) => [entry.offset, entry])).values()]
            .sort((left, right) => left.offset - right.offset);
          const seen = new Set<string>();
          for (const entry of ordered) {
            expect(entry.offset % 100).toBe(0);
            for (const id of entry.ids) {
              expect(seen.has(id)).toBe(false);
              seen.add(id);
            }
          }
          const last = ordered.at(-1);
          if (last) expect(last.hasMore).toBe(false);
        }

        const beforeIdle = taskRequests.length;
        await page.waitForTimeout(10_000);
        expect(taskRequests.length).toBe(beforeIdle);
        console.log(`[kanban-e2e] size=${size} loaded=${await loadedTasks(page, fixture.marker)} requests=${taskRequests.length} idle-new-requests=${taskRequests.length - beforeIdle}`);

        if (size === 101) {
          await page.getByText(fixture.boardName, { exact: true }).click();
          const openColumn = page.locator('[data-rfd-droppable-id="kanban:Open"]');
          await openColumn.evaluate((element) => { element.scrollTop = element.scrollHeight; });
          await expect(page.getByText(`${fixture.marker} Task 0101`, { exact: true })).toBeVisible();
        }
    } finally {
      await fixture.client.query("DELETE FROM workspaces WHERE id=$1", [fixture.workspaceId]).catch(() => undefined);
      await fixture.client.end().catch(() => undefined);
      await page.close().catch(() => undefined);
      await context.close();
    }
    });
  }
});
