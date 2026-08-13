import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";

const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;

async function login(browser: Browser, baseURL: string, email = "portal-manager@smartmanage-demo.com") {
  const context = await browser.newContext({ baseURL });
  const response = await context.request.post(`${baseURL}/api/login/`, {
    data: { email, password },
    headers: { Origin: baseURL },
  });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  await context.setExtraHTTPHeaders({ Authorization: `Bearer ${body.token}` });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }, { token: body.token, user: body.user });
  return { context, user: body.user };
}

async function openBoard(page: Page, workspaceId: string, boardName: string, initialValue: string) {
  await page.goto(`/workspace/?id=${workspaceId}`);
  await page.getByText(boardName, { exact: true }).click();
  await expect(page.getByText(initialValue, { exact: true })).toBeVisible({ timeout: 30_000 });
}

async function expectRealtimeSubscribed(page: Page, tableId: string) {
  await expect.poll(() => page.evaluate((id) => (window as any).__smartManageRealtimeStatus?.[id], tableId), {
    timeout: 20_000,
  }).toBe("SUBSCRIBED");
}

async function editTextCell(page: Page, tableId: string, rowId: string, columnId: string, value: string) {
  const response = await page.request.patch(`/api/tables/${tableId}/tasks/${rowId}/cells/${columnId}`, {
    data: { value },
  });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  expect(body.realtimeBroadcasted).toBe(true);
}

test.describe("focused authenticated realtime sync", () => {
  test.setTimeout(180_000);
  test.skip(!password, "SMART_MANAGE_PORTAL_TEST_PASSWORD is required");

  test("two sessions sync, recover after reconnect, and isolate board topics", async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "Focused desktop two-session test");
    const loginA = await login(browser, baseURL!);
    const loginB = await login(browser, baseURL!);
    const restrictedLogin = await login(browser, baseURL!, "driver-a@smartmanage-demo.com");
    const userA = loginA.context;
    const userB = loginB.context;
    const restrictedUser = restrictedLogin.context;
    let workspaceId = "";
    const consoleFailures: string[] = [];
    try {
      const suffix = Date.now();
      const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await client.connect();
      workspaceId = randomUUID();
      await client.query(
        "INSERT INTO workspaces(id,name,owner_id,is_demo,demo_expires_at,demo_metadata,created_at,updated_at) VALUES($1,$2,$3,TRUE,NOW()+INTERVAL '1 hour',$4::jsonb,NOW(),NOW())",
        [workspaceId, `Realtime Isolated ${suffix}`, String(loginA.user.id), JSON.stringify({ purpose: "realtime-acceptance" })],
      );
      await client.end();

      const columnId = randomUUID();
      const primary = { id: randomUUID(), name: `Realtime Primary ${suffix}` };
      const unrelated = { id: randomUUID(), name: `Realtime Unrelated ${suffix}` };
      const primaryRow = { id: randomUUID() };
      const seed = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await seed.connect();
      const columns = JSON.stringify([{ id: columnId, name: "Name", type: "Text", order: 0 }]);
      await seed.query(
        "INSERT INTO tables(id,name,workspace_id,columns,created_at) VALUES($1,$2,$3,$4::jsonb,(EXTRACT(EPOCH FROM NOW())*1000)::bigint),($5,$6,$3,$4::jsonb,(EXTRACT(EPOCH FROM NOW())*1000)::bigint)",
        [primary.id, primary.name, workspaceId, columns, unrelated.id, unrelated.name],
      );
      await seed.query(
        "INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) VALUES($1,$2,$3::jsonb,$4,NOW(),NOW()),($5,$6,$7::jsonb,$4,NOW(),NOW())",
        [primaryRow.id, primary.id, JSON.stringify({ [columnId]: "Realtime initial" }), String(loginA.user.id), randomUUID(), unrelated.id, JSON.stringify({ [columnId]: "Unrelated unchanged" })],
      );
      await seed.query(
        `INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,portal_type,record_access,updated_at)
         VALUES($1,$2,'viewer','member','standard','{"scope":"all"}'::jsonb,NOW())`,
        [workspaceId, String(restrictedLogin.user.id)],
      );
      await seed.end();

      const deniedTopic = await restrictedUser.request.get(`/api/tables/${primary.id}/realtime-topic?workspaceId=${workspaceId}`);
      expect([403, 404]).toContain(deniedTopic.status());
      const deniedRows = await restrictedUser.request.get(`/api/tables/${primary.id}/tasks?workspaceId=${workspaceId}`);
      expect([403, 404]).toContain(deniedRows.status());
      const guessedBoard = await restrictedUser.request.get(`/api/tables/${randomUUID()}/realtime-topic?workspaceId=${workspaceId}`);
      expect([403, 404]).toContain(guessedBoard.status());

      const pageA = await userA.newPage();
      const pageB = await userB.newPage();
      const unrelatedPage = await userB.newPage();
      for (const page of [pageA, pageB, unrelatedPage]) {
        page.on("console", (message) => {
          if (["error", "warning"].includes(message.type())) console.log(`[browser ${message.type()}] ${message.text()}`);
          if (/Failed to subscribe to table rows/i.test(message.text())) consoleFailures.push(message.text());
        });
        page.on("pageerror", (error) => console.log(`[browser pageerror] ${error.message}`));
      }
      await openBoard(pageA, workspaceId, primary.name, "Realtime initial");
      await openBoard(pageB, workspaceId, primary.name, "Realtime initial");
      await openBoard(unrelatedPage, workspaceId, unrelated.name, "Unrelated unchanged");
      await expectRealtimeSubscribed(pageA, primary.id);
      await expectRealtimeSubscribed(pageB, primary.id);
      await expectRealtimeSubscribed(unrelatedPage, unrelated.id);
      await unrelatedPage.waitForTimeout(1_000);

      let primaryRefreshesOnB = 0;
      pageB.on("response", (response) => {
        if (response.request().method() === "GET" && response.url().includes(`/tables/${primary.id}/tasks`)) primaryRefreshesOnB += 1;
      });
      const unrelatedEventsBefore = await unrelatedPage.evaluate(() => (window as any).__smartManageRealtimeReceived || 0);

      await editTextCell(pageA, primary.id, primaryRow.id, columnId, "Realtime from A");
      await expect.poll(() => pageB.evaluate(() => (window as any).__smartManageRealtimeReceived || 0), { timeout: 10_000 }).toBe(1);
      await expect(pageB.getByText("Realtime from A", { exact: true })).toBeVisible({ timeout: 20_000 });
      expect(primaryRefreshesOnB).toBe(1);
      expect(await unrelatedPage.evaluate(() => (window as any).__smartManageRealtimeReceived || 0)).toBe(unrelatedEventsBefore);

      primaryRefreshesOnB = 0;
      await editTextCell(pageB, primary.id, primaryRow.id, columnId, "Realtime from B");
      await expect(pageA.getByText("Realtime from B", { exact: true })).toBeVisible({ timeout: 20_000 });

      await userB.setOffline(true);
      await editTextCell(pageA, primary.id, primaryRow.id, columnId, "Realtime after reconnect");
      await expect(pageB.getByText("Realtime after reconnect", { exact: true })).toBeHidden();
      await userB.setOffline(false);
      await expect(pageB.getByText("Realtime after reconnect", { exact: true })).toBeVisible({ timeout: 30_000 });
      // One browser-online recovery plus one SUBSCRIBED recovery is allowed;
      // neither is a duplicate realtime event and both use the authorized API.
      expect(primaryRefreshesOnB).toBeLessThanOrEqual(2);
      expect(await unrelatedPage.evaluate(() => (window as any).__smartManageRealtimeReceived || 0)).toBe(unrelatedEventsBefore);
      await expect(unrelatedPage.getByText("Unrelated unchanged", { exact: true })).toBeVisible();
      expect(consoleFailures).toEqual([]);
    } finally {
      const cleanup = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await cleanup.connect();
      if (workspaceId) await cleanup.query("DELETE FROM workspaces WHERE id=$1 AND is_demo=TRUE AND demo_metadata->>'purpose'='realtime-acceptance'", [workspaceId]);
      await cleanup.end();
      await Promise.all([userA.close(), userB.close(), restrictedUser.close()]);
    }
  });
});
