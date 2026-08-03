import { expect, test } from "@playwright/test";

async function gotoStable(page, path: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30000 }); return; }
    catch (error) { if (attempt === 2) throw error; await page.waitForTimeout(1000); }
  }
}

test("public landing has clear product and authentication routes", async ({ page }) => {
  await gotoStable(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Manage your entire business");
  await expect(page.getByText("Smart Manage", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Start for free/i })).toBeVisible();
});

test("login and registration transition remains available", async ({ page }) => {
  await gotoStable(page, "/login/"); await expect(page.getByText("Smart Manage", { exact: true })).toBeVisible();
  await gotoStable(page, "/login/?mode=signup"); await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
});
