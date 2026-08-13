import { expect, test } from "@playwright/test";

const portalCases = [
  ["driver", "/driver-trips/"], ["doctor", "/portal/doctor/"], ["teacher", "/portal/teacher/"],
  ["client", "/portal/client/"], ["employee", "/portal/employee/"], ["warehouse", "/portal/warehouse/"],
] as const;

for (const [role, path] of portalCases) {
  test(`${role} portal is protected and cannot leak records anonymously`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" }).catch((error) => { if (!String(error).includes("ERR_ABORTED")) throw error; });
    await expect(page).toHaveURL(/\/login\/?(?:\?|$)/, { timeout: 20_000 });
    await expect(page).not.toHaveURL(/tripId=|rowId=/);
    await expect(page.locator("body")).not.toContainText(/assignedDriverUserId|internal company notes/i);
  });
}
