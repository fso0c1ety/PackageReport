import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true, channel: "msedge" }).catch(() => chromium.launch({ headless: true }));
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:3199", { waitUntil: "networkidle" });
await page.getByTestId("dataset-size").waitFor();
const mounted = await page.locator('[data-testid^="kanban-card-"]').count();
const domNodes = await page.locator("*").count();
const initial = { mounted, domNodes, dataset: await page.getByTestId("dataset-size").innerText() };
if (mounted >= 500) throw new Error(`virtualization bound failed: ${mounted} mounted cards`);

const first = page.locator('[data-testid="kanban-card-task-1"]');
await first.focus();
await page.keyboard.press(" ");
await page.keyboard.press("ArrowDown");
await page.keyboard.press(" ");
await page.waitForTimeout(100);
const keyboardMove = await page.getByTestId("last-move").innerText();
if (!keyboardMove.includes("task-1")) throw new Error(`keyboard DnD did not complete: ${keyboardMove}`);

await page.getByTestId("size-0").click();
if (await page.locator('[data-testid^="kanban-card-"]').count() !== 0) throw new Error("empty dataset still mounted cards");
await page.getByTestId("size-5000").click();
await page.waitForTimeout(100);
const afterReset = await page.locator('[data-testid^="kanban-card-"]').count();
if (afterReset >= 500) throw new Error(`virtualization bound failed after reset: ${afterReset}`);

console.log(JSON.stringify({ status: "PASS", initial, afterReset, keyboardMove, errors }, null, 2));
await browser.close();
