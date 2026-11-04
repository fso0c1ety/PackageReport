import { spawn } from "node:child_process";
import { chromium } from "playwright";
import fs from 'node:fs';

const executable = process.env.SMART_MANAGE_ELECTRON_EXE;
const password = process.env.SMART_MANAGE_DEMO_PASSWORD;
if (!executable || !password) throw new Error("Electron executable and demo credential environment are required");
const backend = new URL(process.env.NEXT_PUBLIC_API_URL || '');
if (!['127.0.0.1', 'localhost'].includes(backend.hostname) || backend.protocol !== 'http:') throw new Error('Installed acceptance requires explicit loopback backend');
const db = new URL(process.env.DATABASE_URL || '');
if (!['127.0.0.1', 'localhost'].includes(db.hostname) || db.pathname !== '/smart_manage_portal_acceptance') throw new Error('Isolated acceptance database required');

const port = 9333;
const child = spawn(executable, [`--remote-debugging-port=${port}`], { stdio: "ignore", windowsHide: false });
let browser;
try {
  let endpoint;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) endpoint = (await response.json()).webSocketDebuggerUrl;
    } catch {}
    if (endpoint) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!endpoint) throw new Error("Packaged Electron app did not expose a healthy renderer");
  browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  const denied = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['app:', 'data:', 'blob:'].includes(url.protocol) || ['localhost','127.0.0.1'].includes(url.hostname)) return route.continue();
    denied.push(url.origin);
    return route.abort('blockedbyclient');
  });
  let page;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    page = context.pages().find((candidate) => candidate.url().startsWith("app://localhost/"));
    if (page) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!page) throw new Error("Packaged main renderer did not load app:// assets");
  await page.waitForLoadState("domcontentloaded");
  await page.goto("app://localhost/login.html");
  await page.getByLabel(/email/i).fill("demo@smartmanage.com");
  await page.getByRole("textbox", { name: /^password$/i }).fill(password);
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 30_000 });
  await page.goto("app://localhost/home.html");
  await page.waitForLoadState("domcontentloaded");
  if (await page.locator("body").getByText(/failed to fetch|blank screen|not found/i).count()) throw new Error("Packaged home rendered a fatal error");
  const api = await page.evaluate(async () => {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/workspaces", { headers: { Authorization: `Bearer ${token}` } });
    const workspaces = response.ok ? await response.json() : [];
    const workspace = workspaces[0];
    const tablesResponse = workspace ? await fetch(`/api/workspaces/${workspace.id}/tables`, { headers: { Authorization: `Bearer ${token}` } }) : null;
    const tables = tablesResponse?.ok ? await tablesResponse.json() : [];
    const firstTable = tables[0];
    if (!firstTable) throw new Error('Synthetic board missing');
    const detailResponse = await fetch(`/api/tables/${firstTable.id}`, {headers:{Authorization:`Bearer ${token}`}});
    if (!detailResponse.ok) throw new Error('Cannot inspect synthetic board');
    const detail = await detailResponse.json();
    const column = (detail.columns || firstTable.columns || []).find(c => /^(text|longtext)$/i.test(c.type));
    if (!column) throw new Error('No synthetic text column available for mutation test');
    const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
    const id=crypto.randomUUID();
    const create=await fetch(`/api/tables/${firstTable.id}/tasks`,{method:'POST',headers,body:JSON.stringify({id,values:{[column.id]:'Installed acceptance task'}})});
    if (!create.ok) throw new Error(`Synthetic task create failed: ${create.status}`);
    const edit=await fetch(`/api/tables/${firstTable.id}/tasks/${id}/cells/${column.id}`,{method:'PATCH',headers,body:JSON.stringify({value:'Installed acceptance edited'})});
    if (!edit.ok) throw new Error(`Synthetic task edit failed: ${edit.status}`);
    const verify=await fetch(`/api/tables/${firstTable.id}/tasks/${id}`,{headers});
    if (!verify.ok || (await verify.json()).values?.[column.id] !== 'Installed acceptance edited') throw new Error('Synthetic edit did not persist');
    const rowsResponse = firstTable ? await fetch(`/api/tables/${firstTable.id}/tasks`, { headers: { Authorization: `Bearer ${token}` } }) : null;
    const rows = rowsResponse?.ok ? await rowsResponse.json() : [];
    return { status: response.status, count: workspaces.length, tableStatus: tablesResponse?.status, tables: tables.length, rowStatus: rowsResponse?.status, rows: rows.length };
  });
  if (api.status !== 200 || api.count < 1 || api.tableStatus !== 200 || api.tables < 1 || api.rowStatus !== 200 || api.rows < 1) throw new Error(`Packaged workspace/board connectivity failed (${JSON.stringify(api)})`);
  // The isolated firewall intentionally blocks the public updater. The updater
  // may finish asynchronously after the first renderer load, so settle and
  // dismiss its recoverable overlay immediately before opening Account settings.
  const dismissUpdater = async () => {
    // The isolated firewall can leave electron-updater in a failed state only
    // after its network timeout completes. Keep using the real Later control,
    // but allow that state transition to finish before opening Account.
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const later = page.getByRole('button', { name: 'Later', exact: true });
      if (await later.isVisible().catch(() => false)) {
        await later.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(500);
        continue;
      }
      await page.waitForTimeout(500);
    }
    // Require a short quiet period so a delayed updater state update cannot
    // cover the real Account/Logout controls immediately afterward.
    await page.waitForTimeout(1500);
    if (await page.getByRole('button', { name: 'Later', exact: true }).isVisible().catch(() => false)) {
      throw new Error('Updater overlay did not settle before logout');
    }
  };
  await dismissUpdater();
  await page.getByRole('button', {name:'Account settings'}).click();
  await dismissUpdater();
  const preLogoutCookies = await context.cookies();
  const preLogoutRefresh = preLogoutCookies.find(cookie => cookie.name === 'smart_manage_refresh')?.value;
  if (!preLogoutRefresh) throw new Error('Pre-logout refresh session cookie was not captured');
  const logoutCalls=[];
  page.on('request',request=>{if(/\/(users\/fcm|auth\/logout)/.test(request.url()))logoutCalls.push({event:'request',method:request.method(),path:new URL(request.url()).pathname,time:Date.now()});});
  page.on('response',response=>{if(/\/(users\/fcm|auth\/logout)/.test(response.url()))logoutCalls.push({event:'response',status:response.status(),path:new URL(response.url()).pathname,time:Date.now()});});
  fs.mkdirSync('artifacts/windows-functional',{recursive:true});
  fs.writeFileSync('artifacts/windows-functional/pre-logout.json',JSON.stringify({loginUI:true,workspaceAPI:true,taskCreateEditPersistenceAPI:true,taskUI:false,kanbanUI:false}));
  const [revoked] = await Promise.all([
    page.waitForResponse(response => response.url().includes('/auth/logout') && response.request().method()==='POST'),
    page.getByRole('button', {name:'Logout',exact:true}).click(),
  ]).catch(async error=>{
    fs.writeFileSync('artifacts/windows-functional/logout-calls.json',JSON.stringify(logoutCalls));
    await page.screenshot({path:'artifacts/windows-functional/logout-failure.png'}).catch(()=>{});
    throw error;
  });
  if (!revoked.ok()) throw new Error(`Logout session revocation failed: ${revoked.status()}`);
  fs.writeFileSync('artifacts/windows-functional/logout-calls.json',JSON.stringify(logoutCalls));
  await page.waitForURL(url => url.pathname.includes('login'));
  if (await page.evaluate(()=>Boolean(localStorage.getItem('token')))) throw new Error('Logout retained access token');
  const refreshReuse = await context.request.post(new URL('/api/auth/refresh', backend).toString(), {
    headers: { Cookie: `smart_manage_refresh=${preLogoutRefresh}` },
  });
  if (refreshReuse.status() !== 401) throw new Error(`Revoked refresh session was reusable (${refreshReuse.status()})`);
  fs.writeFileSync('artifacts/windows-functional/blocked-external-requests.json', JSON.stringify({ blocked: denied, isolation: 'fail-closed' }));
  console.log(JSON.stringify({ started: true, renderer: "app://localhost", loginUI: true, workspaceAPI: true, taskCreateEditPersistenceAPI:true, taskUI:'NOT TESTED',kanbanUI:'NOT TESTED',workspaces: api.count, boards: api.tables, rows: api.rows, logoutUI: true, refreshSessionRevoked: true, revokedRefreshStatus: refreshReuse.status(), blockedExternalRequests: denied.length }));
} finally {
  await browser?.close().catch(() => {});
  child.kill();
}
