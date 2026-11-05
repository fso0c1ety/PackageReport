import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID, createHmac } from "node:crypto";
import pg from "pg";

const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;
const databaseUrl = process.env.DATABASE_URL || "";
const isolated = process.env.KANBAN_E2E_ISOLATED === "1";
const sizes = [50, 100, 101, 500, 1100];
const measurementEmail = (process.env.EGRESS_MEASURE_EMAILS || '').split(',').map((value) => value.trim()).filter(Boolean)[0] || 'portal-manager-v2@smartmanage-demo.com';

function assertLocalDatabase(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!(host === "localhost" || host === "127.0.0.1" || host === "::1") || !/kanban|acceptance|test/i.test(database)) {
    throw new Error("Kanban E2E requires a local PostgreSQL database named for testing");
  }
}

async function login(browser: Browser, baseURL: string, email = measurementEmail) {
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
  const newTask = page.getByRole("button", { name: "New task", exact: true });
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

  test('release UI creates edits moves and reloads a Kanban task', async ({ browser, baseURL }) => {
    const { context, userId } = await login(browser, baseURL!);
    const fixture = await seedBoard(userId, 2);
    const page = await context.newPage();
    try {
      await page.goto(`/workspace/?id=${fixture.workspaceId}`);
      await chooseKanban(page, fixture.boardName);
      const createdResponse = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.replace(/\/$/,'') === `/api/tables/${fixture.tableId}/tasks`);
      await page.getByRole('button', { name: /^New Task$/i }).last().click();
      const response = await createdResponse;
      expect(response.ok()).toBe(true);
      const created = await response.json();
      const dialog = page.getByRole('dialog').last();
      await expect(dialog).toBeVisible();
      const title = `${fixture.marker} UI created`;
      const field = dialog.getByPlaceholder('Empty').first();
      await field.fill(title);
      await field.press('Enter');
      const columns = (await fixture.client.query('SELECT columns FROM tables WHERE id=$1',[fixture.tableId])).rows[0].columns;
      const nameId = columns[0].id;
      const statusId = columns[1].id;
      await expect.poll(async () => (await fixture.client.query('SELECT values FROM rows WHERE id=$1',[created.id])).rows[0]?.values[nameId]).toBe(title);
      await field.fill(`${title} edited`);
      await field.press('Enter');
      await expect.poll(async () => (await fixture.client.query('SELECT values FROM rows WHERE id=$1',[created.id])).rows[0]?.values[nameId]).toBe(`${title} edited`);
      await dialog.getByRole('button').filter({hasText:'×'}).click();
      const card = page.locator(`[data-rfd-draggable-id="${created.id}"]`);
      await expect(card).toBeVisible();
      await card.focus();
      await card.press('Space');
      await card.press('ArrowLeft');
      await card.press('Space');
      await expect.poll(async () => (await fixture.client.query('SELECT values FROM rows WHERE id=$1',[created.id])).rows[0]?.values[statusId]).toBe('Open');
      await page.reload();
      await chooseKanban(page,fixture.boardName);
      await expect(page.locator('[data-rfd-droppable-id="kanban:Open"]').getByText(`${title} edited`,{exact:true})).toBeVisible();
      const unauthenticated = await browser.newContext({baseURL});
      try { expect((await unauthenticated.request.get(`/api/tables/${fixture.tableId}/tasks`)).status()).toBe(401); } finally {await unauthenticated.close();}
      await test.info().attach('kanban-ui-assertions',{body:JSON.stringify({uiCreate:true,uiEdit:true,keyboardDrag:true,persistence:true,reload:true,unauthenticatedDenied:true,installedDesktop:'Separate installed suite; this test is browser UI'}),contentType:'application/json'});
    } finally {
      await fixture.client.query('DELETE FROM workspaces WHERE id=$1',[fixture.workspaceId]);
      await fixture.client.end();
      await context.close();
    }
  });

  test('release notification event delivers and UI marks it read', async ({ browser, baseURL }) => {
    const owner = await login(browser,baseURL!);
    const recipient = await login(browser,baseURL!,'driver-b@smartmanage-demo.com');
    const fixture = await seedBoard(owner.userId,2);
    try {
      await fixture.client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,record_access,updated_at) VALUES($1,$2,'member','member','{"scope":"all_permitted"}'::jsonb,NOW())`,[fixture.workspaceId,recipient.userId]);
      await fixture.client.query(`INSERT INTO board_member_access(table_id,user_id,board_role,capabilities,record_access,updated_at) VALUES($1,$2,'viewer','{}'::jsonb,'{"scope":"all_permitted"}'::jsonb,NOW())`,[fixture.tableId,recipient.userId]);
      const row = (await fixture.client.query('SELECT id,values FROM rows WHERE table_id=$1 ORDER BY id LIMIT 1',[fixture.tableId])).rows[0];
      const columns = (await fixture.client.query('SELECT columns FROM tables WHERE id=$1',[fixture.tableId])).rows[0].columns;
      const changed = {...row.values,[columns[0].id]:`${fixture.marker} notification event`};
      expect((await recipient.context.request.get(`/api/tables/${fixture.tableId}/tasks/${row.id}`)).status()).toBe(200);
      const response = await owner.context.request.put(`/api/tables/${fixture.tableId}/tasks`,{data:{id:row.id,values:changed}});
      expect(response.ok(),await response.text()).toBe(true);
      let id='';
      await expect.poll(async()=>{
        const r=await fixture.client.query("SELECT id,read FROM notifications WHERE recipient_id=$1 AND type='record_update' AND data->>'taskId'=$2",[recipient.userId,row.id]);
        if(r.rows.length===1){id=r.rows[0].id;expect(r.rows[0].read).toBe(false);}
        return r.rows.length;
      },{timeout:30000}).toBe(1);
      const delivered=await recipient.context.request.get('/api/notifications/');
      expect(delivered.ok()).toBe(true);
      expect((await delivered.json()).some((n:{id:string})=>n.id===id)).toBe(true);
      const excluded=await owner.context.request.get('/api/notifications/');
      expect((await excluded.json()).some((n:{id:string})=>n.id===id)).toBe(false);
      const page=await recipient.context.newPage();
      await page.goto(`/workspace/?id=${fixture.workspaceId}`);
      await page.getByRole('button',{name:'Notifications',exact:true}).click();
      await expect(page.getByRole('menu').getByText(`${fixture.boardName} updated`,{exact:true})).toBeVisible();
      await expect.poll(async()=>(await fixture.client.query('SELECT read FROM notifications WHERE id=$1',[id])).rows[0]?.read).toBe(true);
      await page.reload();
      expect((await fixture.client.query('SELECT read FROM notifications WHERE id=$1',[id])).rows[0].read).toBe(true);
      await test.info().attach('notification-lifecycle',{body:JSON.stringify({event:'record update',recipientDelivery:true,UIVisible:true,UIRead:true,readPersists:true,senderIsolation:true,pushDelivery:'NOT TESTED',logout:'Separate installed suite'}),contentType:'application/json'});
    } finally {
      await fixture.client.query("DELETE FROM notifications WHERE data->>'workspaceId'=$1",[fixture.workspaceId]);
      await fixture.client.query('DELETE FROM workspaces WHERE id=$1',[fixture.workspaceId]);
      await fixture.client.end();await owner.context.close();await recipient.context.close();
    }
  });

  test('release scheduled automation executes and prevents duplicate notification', async ({browser,baseURL}) => {
    const owner=await login(browser,baseURL!);
    const fixture=await seedBoard(owner.userId,2);
    let automationId: string | undefined;
    let rowId: string | undefined;
    try {
      const dateColumn=randomUUID();
      const dateValue=new Date(Date.now()-60_000).toISOString();
      await fixture.client.query("UPDATE tables SET columns=columns || $1::jsonb WHERE id=$2",[JSON.stringify([{id:dateColumn,name:'Due',type:'Date',order:2}]),fixture.tableId]);
      rowId=(await fixture.client.query('SELECT id FROM rows WHERE table_id=$1 ORDER BY id LIMIT 1',[fixture.tableId])).rows[0].id;
      await fixture.client.query('UPDATE rows SET values=values || $1::jsonb WHERE id=$2',[JSON.stringify({[dateColumn]:dateValue}),rowId]);
      automationId=String((await fixture.client.query(`INSERT INTO automations(table_id,enabled,created_by,trigger_type,trigger_col,task_ids,action_type,recipients,definition) VALUES($1,TRUE,$2,'date_arrives',$3,$4::jsonb,'notification',$5::jsonb,'{}'::jsonb) RETURNING id`,[fixture.tableId,owner.userId,dateColumn,JSON.stringify([rowId]),JSON.stringify([measurementEmail])])).rows[0].id);
      expect(process.env.JWT_SECRET,'Synthetic scheduler secret required').toBeTruthy();
      const token=createHmac('sha256',process.env.JWT_SECRET!).update('smart-manage:scheduled-automations:v1').digest('hex');
      const due=()=>owner.context.request.get('/api/automation/due/',{headers:{Authorization:`Bearer ${token}`}});
      const first=await due();expect(first.status(),await first.text()).toBe(200);
      expect((await first.json()).triggered.some((x:{automationId:string|number})=>String(x.automationId)===automationId)).toBe(true);
      const run=await fixture.client.query('SELECT status,scheduled_for FROM automation_runs WHERE automation_id=$1',[automationId]);
      expect(run.rows).toHaveLength(1);expect(run.rows[0].status).toBe('success');expect(run.rows[0].scheduled_for).toBeTruthy();
      const notifications=()=>fixture.client.query("SELECT id FROM notifications WHERE recipient_id=$1 AND type='automation' AND data->>'taskId'=$2",[owner.userId,rowId]);
      expect((await notifications()).rowCount).toBe(1);
      expect((await due()).status()).toBe(200);
      expect((await notifications()).rowCount).toBe(1);
      expect((await fixture.client.query('SELECT id FROM automation_runs WHERE automation_id=$1',[automationId])).rowCount).toBe(1);
      await fixture.client.query('UPDATE automations SET enabled=FALSE WHERE id=$1',[automationId]);
      expect((await due()).status()).toBe(200);
      expect((await notifications()).rowCount).toBe(1);
      await test.info().attach('scheduler-delivery',{body:JSON.stringify({environment:'ISOLATED_MIGRATED_SCHEMA',scheduledExecution:true,successStatus:true,scheduledTimestamp:true,notificationDelivered:true,duplicatePrevented:true,disabled:true,productionMissingScheduledFor:'BLOCKED; separate catalog and legacy fixture evidence'}),contentType:'application/json'});
    } finally {
      if(rowId) await fixture.client.query("DELETE FROM notifications WHERE type='automation' AND data->>'taskId'=$1",[rowId]);
      if(automationId){await fixture.client.query('DELETE FROM automation_runs WHERE automation_id=$1',[automationId]);await fixture.client.query('DELETE FROM automations WHERE id=$1',[automationId]);}
      await fixture.client.query('DELETE FROM workspaces WHERE id=$1',[fixture.workspaceId]);await fixture.client.end();await owner.context.close();
    }
  });

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
        const globalIds = new Set(responses.filter((entry) => entry.scope === "__global__").flatMap((entry) => entry.ids));
        const scopedPages = responses.filter((entry) => entry.scope !== "__global__");
        const scopedIdsOutsideGlobalPrefix = new Set(scopedPages.flatMap((entry) => entry.ids).filter((id) => !globalIds.has(id)));
        expect(new Set([...globalIds, ...scopedIdsOutsideGlobalPrefix]).size).toBe(size);
        for (const entry of responses.filter((candidate) => candidate.scope !== "__global__")) {
          expect(entry.limit).toBe(100);
          expect(entry.revision).toBeTruthy();
          expect(entry.total).toBe(entry.scope === "Open" ? Math.ceil(size / 2) : Math.floor(size / 2));
        }
        for (const scope of ["Open", "Done"]) {
          const scopeResponses = responses.filter((entry) => entry.scope === scope);
          const ordered = [...new Map(scopeResponses.map((entry) => [entry.offset, entry])).values()]
            .sort((left, right) => left.offset - right.offset);
          const scopePrefixIds = new Set(responses.filter((entry) => entry.scope === "__global__").flatMap((entry) => entry.ids));
          for (let index = 1; index < ordered.length; index += 1) {
            const previous = ordered[index - 1];
            const current = ordered[index];
            expect(current.offset).toBe(previous.offset + previous.ids.length);
            expect(current.revision).toBe(previous.revision);
            expect(current.total).toBe(previous.total);
          }
          const seenOutsidePrefix = new Set<string>();
          for (const entry of ordered) {
            for (const id of entry.ids) {
              if (scopePrefixIds.has(id)) continue;
              expect(seenOutsidePrefix.has(id)).toBe(false);
              seenOutsidePrefix.add(id);
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
          await openColumn.evaluate((element) => {
            element.scrollTop = 0;
            element.dispatchEvent(new Event("scroll", { bubbles: true }));
          });
          const target = page.getByText(`${fixture.marker} Task 0101`, { exact: true });
          let reachedTarget = false;
          for (let attempt = 0; attempt < 40; attempt += 1) {
            if (await target.isVisible().catch(() => false)) {
              reachedTarget = true;
              break;
            }
            const progressed = await openColumn.evaluate((element) => {
              const before = element.scrollTop;
              const step = Math.max(1, element.clientHeight * 0.8);
              element.scrollTop = Math.min(element.scrollTop + step, element.scrollHeight - element.clientHeight);
              element.dispatchEvent(new Event("scroll", { bubbles: true }));
              return element.scrollTop > before;
            });
            await page.waitForTimeout(200);
            if (!progressed && !(await target.isVisible().catch(() => false))) break;
          }
          expect(reachedTarget).toBe(true);
          await expect(target).toBeVisible();
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
