import { expect, test } from "@playwright/test";

test("landing presents only the six acceptance-verified portals", async ({ page }) => {
  await page.goto("/");
  const tablist = page.getByRole("tablist", { name:"Verified Smart Manage portals" });
  await expect(tablist).toBeVisible();
  const tabs = tablist.getByRole("tab");
  await expect(tabs).toHaveCount(6);
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Teacher Portal");
  await tabs.nth(1).press("End");
  await expect(tabs.nth(5)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Client Portal");
  const image = page.getByRole("tabpanel").getByRole("img");
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element:HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const overflow = await page.evaluate(() => ({
    documentWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    elements:[...document.querySelectorAll("body *")].map((element) => { const rect=element.getBoundingClientRect(); return {tag:element.tagName,className:String(element.className || "").slice(0,120),src:(element as HTMLImageElement).src || "",parent:String(element.parentElement?.textContent || "").trim().slice(0,100),left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)}; }).filter((item)=>item.right>window.innerWidth+2 || item.left < -2).slice(0,20),
  }));
  expect(overflow.documentWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 2);
});
