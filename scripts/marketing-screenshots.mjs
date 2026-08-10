import { readFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1")), "..");
const manifest = JSON.parse(await readFile(path.join(root, "scripts", ".marketing-demo-manifest.json"), "utf8"));
const password = process.env.SMART_MANAGE_DEMO_PASSWORD;
const baseUrl = String(process.env.MARKETING_SCREENSHOT_BASE_URL || process.env.APP_URL || "https://package-report.vercel.app").replace(/\/$/, "");
if (!password) throw new Error("SMART_MANAGE_DEMO_PASSWORD is required for screenshot capture");
if (!manifest?.demoUserEmail || !manifest?.workspaces?.main) throw new Error("A valid generated demo manifest is required");

const outputDir = path.join(root, "public", "marketing");
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await desktop.newPage();
page.setDefaultNavigationTimeout(90_000);

async function settle(target) {
  await target.waitForLoadState("domcontentloaded");
  await target.evaluate(async () => { await document.fonts.ready; document.documentElement.dataset.marketingCapture = "true"; });
  await target.waitForFunction(() => document.body.innerText.trim() !== "Loading...", null, { timeout: 30_000 }).catch(() => undefined);
  await target.waitForFunction(() => {
    const text = document.body.innerText;
    return !/^Compiling\s*\.{0,3}/m.test(text) && !/^Loading\.{0,3}$/m.test(text);
  }, null, { timeout: 60_000 });
  await target.waitForTimeout(2500);
  const closeTrial = target.getByRole("button", { name: /close subscription banner/i });
  if (await closeTrial.count()) await closeTrial.first().click().catch(() => undefined);
  const body = await target.locator("body").innerText();
  if (/application error|internal server error/i.test(body)) throw new Error(`Page failed QA at ${target.url()}`);
  if (/\b\d+\s+Issue\b|Free Trial|trial\s+—\s+\d+\s+days/i.test(body)) throw new Error(`Page contains a marketing-blocking warning at ${target.url()}`);
  if (body.trim().length < 80) throw new Error(`Page is visually empty at ${target.url()}`);
}
async function capture(target, name, route) {
  await target.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" }); await settle(target);
  if (route.startsWith("/workspace")) {
    await target.waitForFunction(() => {
      const table = document.querySelector("table");
      return table && (table.textContent || "").trim().length > 120;
    }, null, { timeout: 60_000 });
    await target.waitForTimeout(1200);
  }
  await target.screenshot({ path: path.join(outputDir, `${name}.webp`), type: "webp", quality: 86, fullPage: false });
  const size = (await stat(path.join(outputDir, `${name}.webp`))).size;
  if (size < 20_000) throw new Error(`${name}.webp failed minimum visual size validation`);
}

await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
await page.getByLabel(/email/i).fill(manifest.demoUserEmail);
await page.locator('input[name="password"]').fill(password);
await Promise.all([page.waitForURL(/\/(home|dashboard|workspace)/, { timeout: 30_000, waitUntil: "domcontentloaded" }), page.getByRole("button", { name: /log in|sign in/i }).click()]);

const targets = [
  ["dashboard", "/home"],
  ["boards", manifest.workspaces.main.workspaceRoute],
  ["logistics", manifest.workspaces.freight.workspaceRoute],
  ["fleet", manifest.workspaces.fleet.workspaceRoute],
  ["crm", manifest.workspaces.crm.workspaceRoute],
  ["daycare", manifest.workspaces.daycare.workspaceRoute],
  ["dental", manifest.workspaces.dental.workspaceRoute],
  ["construction", manifest.workspaces.construction.workspaceRoute],
];
for (const [name, route] of targets) {
  console.log(`Capturing ${name}`);
  await capture(page, name, route);
}

await browser.close();
console.log(`Captured ${targets.length} validated real Smart Manage screenshots`);
