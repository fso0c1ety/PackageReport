import { expect, test, type Browser, type BrowserContext } from "@playwright/test";

const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;

const cases = [
  ["driver", "driver-a@smartmanage-demo.com", "driver-b@smartmanage-demo.com"],
  ["teacher", "teacher-a@smartmanage-demo.com", "teacher-b@smartmanage-demo.com"],
  ["parent", "parent-a@smartmanage-demo.com", "parent-b@smartmanage-demo.com"],
  ["doctor", "doctor-a@smartmanage-demo.com", "doctor-b@smartmanage-demo.com"],
  ["patient", "patient-a@smartmanage-demo.com", "patient-b@smartmanage-demo.com"],
  ["client", "client-a@smartmanage-demo.com", "client-b@smartmanage-demo.com"],
] as const;

async function authenticatedContext(browser: Browser, email: string, baseURL: string, viewport: { width: number; height: number } | undefined) {
  const context = await browser.newContext({ baseURL, viewport });
  const response = await context.request.post(`${baseURL}/api/login/`, {
    data: { email, password },
    headers: { Origin: baseURL },
  });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  const token = body.token;
  expect(token).toBeTruthy();
  await context.addInitScript(({ accessToken, user }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("user", JSON.stringify(user));
  }, { accessToken: token, user: body.user });
  await context.setExtraHTTPHeaders({Authorization:`Bearer ${token}`});
  const page = await context.newPage();
  return { context, page };
}

async function portalPayload(context: BrowserContext, baseURL: string, portalType: string) {
  const contextResponse = await context.request.get(`${baseURL}/api/portal-context/?portalType=${portalType}`);
  expect(contextResponse.status()).toBe(200);
  const portalContext = await contextResponse.json();
  expect(portalContext.active?.portalType).toBe(portalType);
  expect(portalContext.active?.workspaceId).toBeTruthy();

  const response = await context.request.get(`${baseURL}/api/professional-portal/?workspaceId=${encodeURIComponent(portalContext.active.workspaceId)}&portalType=${portalType}`);
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(JSON.stringify(payload)).not.toMatch(/assignedDriverUserId|internal company notes|customer price|carrier price|financial margin/i);
  return { payload, workspaceId: portalContext.active.workspaceId };
}

function recordIds(payload: any) {
  return new Set((payload.entities || []).flatMap((entity: any) => (entity.records || []).map((record: any) => String(record.id))));
}

test.describe("authenticated professional portal isolation", () => {
  test.setTimeout(90_000);
  test.skip(!password, "SMART_MANAGE_PORTAL_TEST_PASSWORD is required");

  for (const [portalType, emailA, emailB] of cases) {
    test(`${portalType} A/B accounts remain isolated and render their assigned portal`, async ({ browser, baseURL }, testInfo) => {
      const viewport = testInfo.project.name === "pixel-7" ? { width: 412, height: 915 } : testInfo.project.name === "mobile-430" ? {width:430,height:932} : testInfo.project.name === "tablet-768" ? {width:768,height:1024} : { width: 1440, height: 900 };
      const first = await authenticatedContext(browser, emailA, baseURL!, viewport);
      const second = await authenticatedContext(browser, emailB, baseURL!, viewport);
      try {
        const a = await portalPayload(first.context, baseURL!, portalType);
        const b = await portalPayload(second.context, baseURL!, portalType);
        expect(a.workspaceId).toBe(b.workspaceId);
        const idsA = recordIds(a.payload);
        const idsB = recordIds(b.payload);
        const overlap=[...idsA].filter((id) => idsB.has(id));
        const overlapByEntity=(a.payload.entities || []).map((entity:any)=>({entity:entity.entity,ids:(entity.records || []).map((record:any)=>String(record.id)).filter((id:string)=>overlap.includes(id))})).filter((entry:any)=>entry.ids.length);
        expect(overlap,JSON.stringify(overlapByEntity)).toEqual([]);

        const route = portalType === "driver" ? "/driver-trips/" : `/portal/${portalType}/`;
        await first.page.goto(route);
        await expect(first.page).toHaveURL(new RegExp(route.replaceAll("/", "\\/").replace(/\\\/$/, "\\/?")), {timeout:20_000});
        await expect(first.page.locator("body")).not.toContainText(/not assigned|unauthorized|forbidden/i, { timeout: 20_000 });
        await expect(first.page.locator("body")).not.toContainText(/assignedDriverUserId|internal company notes/i);
        expect(await first.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
        if (portalType !== "driver") {
          const quickActions = first.page.getByText("Quick actions", {exact:true});
          await expect(quickActions).toBeVisible({ timeout: 20_000 });
          const actionCard = quickActions.locator("xpath=ancestor::*[contains(@class,'MuiCard-root')][1]");
          await actionCard.getByRole("button").first().click();
          await expect(first.page.getByRole("dialog")).toBeVisible();
          expect(await first.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
        }
      } finally {
        await first.context.close();
        await second.context.close();
      }
    });
  }
});
