import { expect, test } from "@playwright/test";

async function gotoStable(page, path: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30000 }); return; }
    catch (error) { if (attempt === 2) throw error; await page.waitForTimeout(1000); }
  }
}

test("public landing has clear product and authentication routes", async ({ page }) => {
  await gotoStable(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Manage your entire business", { timeout: 15000 });
  await expect(page.getByText("Smart Manage", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Start for free/i })).toBeVisible();
});

test("login and registration transition remains available", async ({ page }) => {
  await gotoStable(page, "/login/");
  const publicNavigation = page.getByRole("navigation", { name: "Public navigation" });
  if (await publicNavigation.isVisible()) {
    await expect(publicNavigation.getByRole("link", { name: "Product" })).toHaveAttribute("href", "/#product");
    await expect(publicNavigation.getByRole("link", { name: "Solutions" })).toHaveAttribute("href", "/#solutions");
    await expect(publicNavigation.getByRole("link", { name: "Templates" })).toHaveAttribute("href", "/#templates");
  }
  await expect(page.locator('a[aria-current="page"]')).toHaveAttribute("href", "/login/");
  await expect(page.getByRole("link", { name: "Services" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "About Us" })).toHaveCount(0);

  await gotoStable(page, "/login/?mode=signup");
  await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
  await expect(page.locator('a[aria-current="page"]')).toHaveAttribute("href", "/login/?mode=signup");
});

test("canonical public navigation remains usable on mobile", async ({ page }) => {
  await gotoStable(page, "/login/");
  const openNavigation = page.getByRole("button", { name: "Open navigation" });
  if (await openNavigation.isVisible()) {
    await openNavigation.click();
    const mobileNavigation = page.getByRole("navigation", { name: "Mobile public navigation" });
    await expect(mobileNavigation.getByRole("link", { name: /Product/ })).toBeVisible();
    await expect(mobileNavigation.getByRole("link", { name: /Request Demo/ })).toBeVisible();
    await expect(mobileNavigation.getByRole("link", { name: "Download" })).toHaveAttribute("href", /Smart\.Manage\.zip$/);
  }
  const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});
