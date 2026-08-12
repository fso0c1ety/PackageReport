import { spawn } from "node:child_process";
import { chromium } from "playwright";

const executable = process.env.SMART_MANAGE_ELECTRON_EXE;
const password = process.env.SMART_MANAGE_DEMO_PASSWORD;
if (!executable || !password) throw new Error("Electron executable and demo credential environment are required");

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
    const rowsResponse = firstTable ? await fetch(`/api/tables/${firstTable.id}/tasks`, { headers: { Authorization: `Bearer ${token}` } }) : null;
    const rows = rowsResponse?.ok ? await rowsResponse.json() : [];
    return { status: response.status, count: workspaces.length, tableStatus: tablesResponse?.status, tables: tables.length, rowStatus: rowsResponse?.status, rows: rows.length };
  });
  if (api.status !== 200 || api.count < 1 || api.tableStatus !== 200 || api.tables < 1 || api.rowStatus !== 200 || api.rows < 1) throw new Error(`Packaged workspace/board connectivity failed (${JSON.stringify(api)})`);
  await page.evaluate(() => { localStorage.removeItem("token"); localStorage.removeItem("user"); });
  await page.goto("app://localhost/login.html");
  if (!page.url().includes("login")) throw new Error("Packaged logout navigation failed");
  console.log(JSON.stringify({ started: true, renderer: "app://localhost", login: true, api: true, workspaces: api.count, boards: api.tables, rows: api.rows, logout: true }));
} finally {
  await browser?.close().catch(() => {});
  child.kill();
}
