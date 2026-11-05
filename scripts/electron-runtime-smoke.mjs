import { spawn } from "node:child_process";
import { chromium } from "playwright";
import fs from 'node:fs';
import pg from 'pg';
import { installedKanbanNotification } from './installed-kanban-notification.mjs';

const executable = process.env.SMART_MANAGE_ELECTRON_EXE;
const password = process.env.SMART_MANAGE_DEMO_PASSWORD;
if (!executable || !password) throw new Error("Electron executable and demo credential environment are required");
const backend = new URL(process.env.NEXT_PUBLIC_API_URL || '');
if (!['127.0.0.1', 'localhost'].includes(backend.hostname) || backend.protocol !== 'http:') throw new Error('Installed acceptance requires explicit loopback backend');
const db = new URL(process.env.DATABASE_URL || '');
if (!['127.0.0.1', 'localhost'].includes(db.hostname) || db.pathname !== '/smart_manage_portal_acceptance') throw new Error('Isolated acceptance database required');

const port = 9333;
fs.mkdirSync('artifacts/windows-functional',{recursive:true});
const childOutput=[];
const redact=text=>text.replace(/(apikey=)[^&\s"'<>]+/gi,'$1[redacted]').replace(/sb_(publishable|secret)_[A-Za-z0-9_-]+/g,'[redacted-key]').replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[redacted-jwt]');
const child = spawn(executable, [`--remote-debugging-port=${port}`], { stdio: ['ignore','pipe','pipe'], windowsHide: false });
child.stdout.on('data',chunk=>childOutput.push(chunk.toString()));
child.stderr.on('data',chunk=>childOutput.push(chunk.toString()));
child.on('exit',(code,signal)=>fs.writeFileSync('artifacts/windows-functional/electron-exit.json',JSON.stringify({code,signal})));
let browser,page;
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
  for (let attempt = 0; attempt < 60; attempt += 1) {
    page = browser.contexts().flatMap(context=>context.pages()).find(candidate=>!candidate.isClosed() && candidate.url().startsWith('app://localhost/'));
    if(page)break;
    if(child.exitCode!==null)throw Error(`Installed Electron exited before main renderer: ${child.exitCode}`);
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!page)throw Error('Packaged main renderer did not load app:// assets');
  await page.waitForLoadState('domcontentloaded');
  const context=page.context();
  const denied = [];
  const realtimeConfiguration=[];
  await page.routeWebSocket('**/*', websocket=>{
    const url=new URL(websocket.url());
    if(['localhost','127.0.0.1'].includes(url.hostname))return websocket.connectToServer();
    denied.push(url.origin);
    if(url.hostname==='gxzvlsukjodbarlcjyys.supabase.co')realtimeConfiguration.push({origin:url.origin,expectedProject:true,publishableKeyPresent:/^sb_publishable_/.test(url.searchParams.get('apikey') || ''),connectionBlocked:true});
    return websocket.close({code:1008,reason:'Isolated acceptance blocks nonlocal sockets'});
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['app:', 'data:', 'blob:'].includes(url.protocol) || ['localhost','127.0.0.1'].includes(url.hostname)) return route.continue();
    denied.push(url.origin);
    return route.abort('blockedbyclient');
  });
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
  await installedKanbanNotification(page);
  await dismissUpdater();
  await page.getByRole('button', {name:'Account settings'}).click();
  await dismissUpdater();
  const preLogoutCookies = await context.cookies();
  const preLogoutRefresh = preLogoutCookies.find(cookie => cookie.name === 'smart_manage_refresh')?.value;
  if (!preLogoutRefresh) throw new Error('Pre-logout refresh session cookie was not captured');
  if(!await page.evaluate(()=>window.smartManageSecureStorage.getRefreshToken()))throw new Error('Native secure refresh session was not stored before logout');
  const logoutUserId=await page.evaluate(async()=>{
    const response=await fetch('/api/users/fcm/',{method:'PUT',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'},body:JSON.stringify({token:'isolated-synthetic-fcm-cleanup-only'})});
    if(!response.ok)throw Error(`Synthetic FCM registration failed: ${response.status}`);
    return String(JSON.parse(localStorage.getItem('user') || '{}').id);
  });
  const logoutCalls=[];
  page.on('request',request=>{if(/\/(users\/fcm|auth\/logout)/.test(request.url()))logoutCalls.push({event:'request',method:request.method(),path:new URL(request.url()).pathname,time:Date.now()});});
  page.on('response',response=>{if(/\/(users\/fcm|auth\/logout)/.test(response.url()))logoutCalls.push({event:'response',status:response.status(),path:new URL(response.url()).pathname,time:Date.now()});});
  fs.mkdirSync('artifacts/windows-functional',{recursive:true});
  fs.writeFileSync('artifacts/windows-functional/pre-logout.json',JSON.stringify({loginUI:true,workspaceAPI:true,taskCreateEditPersistenceAPI:true,taskUI:true,kanbanUI:true,notificationUI:true}));
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
  if(await page.evaluate(()=>window.smartManageSecureStorage.getRefreshToken()))throw Error('Logout retained native secure refresh token');
  const cleanupDb=new pg.Client({connectionString:db.href,ssl:false});
  await cleanupDb.connect();
  try {
    let cleared=false;
    for(let attempt=0;attempt<20;attempt++){
      const row=(await cleanupDb.query('SELECT fcm_token,fcm_tokens FROM users WHERE id=$1',[logoutUserId])).rows[0];
      cleared=row?.fcm_token===null && Array.isArray(row.fcm_tokens) && row.fcm_tokens.length===0;
      if(cleared)break;await new Promise(resolve=>setTimeout(resolve,500));
    }
    if(!cleared)throw Error('Synthetic server FCM registration was not cleared by real UI logout');
  } finally {await cleanupDb.end();}
  const refreshReuse = await context.request.post(new URL('/api/auth/refresh', backend).toString(), {
    headers: { Cookie: `smart_manage_refresh=${preLogoutRefresh}` },
  });
  if (refreshReuse.status() !== 401) throw new Error(`Revoked refresh session was reusable (${refreshReuse.status()})`);
  fs.writeFileSync('artifacts/windows-functional/blocked-external-requests.json', JSON.stringify({ blocked: denied, isolation: 'fail-closed' }));
  if(!realtimeConfiguration.some(item=>item.expectedProject && item.publishableKeyPresent))throw new Error('Exact binary did not expose the expected configured Supabase realtime endpoint');
  fs.writeFileSync('artifacts/windows-functional/realtime-configuration.json',JSON.stringify({observations:realtimeConfiguration,productionConnection:'BLOCKED throughout; not a live realtime delivery test'}));
  console.log(JSON.stringify({ started: true, renderer: "app://localhost", loginUI: true, workspaceAPI: true, taskCreateEditPersistenceAPI:true, taskUI:true,kanbanUI:true,notificationUI:true,fcmRegistrationCleanup:true,nativeSecureTokenCleared:true,OSPush:'NOT TESTED',workspaces: api.count, boards: api.tables, rows: api.rows, logoutUI: true, refreshSessionRevoked: true, revokedRefreshStatus: refreshReuse.status(), blockedExternalRequests: denied.length }));
} catch(error) {
  fs.writeFileSync('artifacts/windows-functional/acceptance-error.json',redact(JSON.stringify({message:error.message,stack:error.stack,childExitCode:child.exitCode,mainPage:page && !page.isClosed()?new URL(page.url()).pathname:null})));
  await page?.screenshot({path:'artifacts/windows-functional/acceptance-failure.png'}).catch(()=>{});
  throw error;
} finally {
  fs.writeFileSync('artifacts/windows-functional/electron-output-redacted.txt',redact(childOutput.join('')));
  await browser?.close().catch(() => {});
  child.kill();
}
