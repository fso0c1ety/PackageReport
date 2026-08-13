import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4000";
const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;
if (!password) throw new Error("SMART_MANAGE_PORTAL_TEST_PASSWORD is required");

const output = path.join(process.cwd(), "public", "marketing", "portals");
const captures = [
  { role:"driver", email:"driver-a@smartmanage-demo.com", route:"/driver-trips/", section:"current" },
  { role:"teacher", email:"teacher-a@smartmanage-demo.com", route:"/portal/teacher/?section=children" },
  { role:"parent", email:"parent-a@smartmanage-demo.com", route:"/portal/parent/?section=home" },
  { role:"doctor", email:"doctor-a@smartmanage-demo.com", route:"/portal/doctor/?section=labrequests" },
  { role:"patient", email:"patient-a@smartmanage-demo.com", route:"/portal/patient/?section=documents" },
  { role:"client", email:"client-a@smartmanage-demo.com", route:"/portal/client/?section=loads" },
];

await mkdir(output, { recursive:true });
const browser = await chromium.launch({ headless:true });
try {
  for (const capture of captures) {
    for (const device of [{name:"desktop",width:1440,height:900},{name:"mobile",width:412,height:915}]) {
      const context = await browser.newContext({ viewport:{width:device.width,height:device.height}, deviceScaleFactor:1 });
      const login = await context.request.post(`${baseURL}/api/login/`, { data:{email:capture.email,password}, headers:{Origin:baseURL} });
      if (!login.ok()) throw new Error(`${capture.role} login failed (${login.status()})`);
      const body = await login.json();
      const portalContext = await context.request.get(`${baseURL}/api/portal-context/?portalType=${capture.role}`, { headers:{Authorization:`Bearer ${body.token}`} });
      if (!portalContext.ok()) throw new Error(`${capture.role} context failed (${portalContext.status()})`);
      const active = (await portalContext.json()).active;
      if (!active?.workspaceId) throw new Error(`${capture.role} demo manifest context is missing`);
      await context.addInitScript(({token,user}) => { localStorage.setItem("token",token); localStorage.setItem("user",JSON.stringify(user)); }, {token:body.token,user:body.user});
      const page = await context.newPage();
      const separator = capture.route.includes("?") ? "&" : "?";
      await page.goto(`${baseURL}${capture.route}${separator}id=${encodeURIComponent(active.workspaceId)}`, { waitUntil:"networkidle" });
      await page.locator("body").waitFor({state:"visible"});
      await page.waitForTimeout(900);
      const bodyText = await page.locator("body").innerText();
      if (/unauthorized|forbidden|not assigned|unable to load portal/i.test(bodyText)) throw new Error(`${capture.role} portal did not render`);
      const screenshotTarget = page.locator("main").first();
      const target = await screenshotTarget.count() ? screenshotTarget : page.locator("body");
      const visibleText = await target.innerText();
      if (/@smartmanage-demo\.com/i.test(visibleText)) throw new Error(`${capture.role} capture would expose a test email`);
      const pngPath = path.join(output, `${capture.role}-${device.name}.png`);
      const webpPath = path.join(output, `${capture.role}-${device.name}.webp`);
      await target.screenshot({path:pngPath,animations:"disabled"});
      await sharp(pngPath).webp({quality:86,effort:5}).toFile(webpPath);
      await rm(pngPath, {force:true});
      await context.close();
      console.log(`Captured ${capture.role}-${device.name}.webp`);
    }
  }
} finally { await browser.close(); }
