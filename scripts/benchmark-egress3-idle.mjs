import { chromium } from 'playwright';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const email = process.env.EGRESS3_EMAIL || 'portal-manager@smartmanage-demo.com';
const password = process.env.EGRESS3_PASSWORD || process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;
const durationSeconds = Number(process.env.EGRESS3_DURATION_SECONDS || 600);
if (!password) throw new Error('EGRESS3_PASSWORD is required');

const result = { durationSeconds, realtimeHealthy: false, total: { requests: 0, bytes: 0 }, categories: {
  home: { requests: 0, bytes: 0 }, calendar: { requests: 0, bytes: 0 }, driverTrips: { requests: 0, bytes: 0 },
  driverDocuments: { requests: 0, bytes: 0 }, notifications: { requests: 0, bytes: 0 }, otherApi: { requests: 0, bytes: 0 },
} };
const classify = (url) => {
  if (url.includes('/calendar-events/reminders')) return 'calendar';
  if (url.includes('/logistics/driver/trips')) return 'driverTrips';
  if (url.includes('/logistics/driver/documents')) return 'driverDocuments';
  if (url.includes('/api/notifications')) return 'notifications';
  if (url.includes('/api/') && (url.includes('/workspaces') || url.includes('/tables'))) return 'home';
  return 'otherApi';
};
const browser = await chromium.launch({ headless: true });
const manager = await browser.newContext({ baseURL });
const driver = await browser.newContext({ baseURL });
const tracked = new Set();
const attach = (context) => {
  context.on('response', async (response) => {
    if (!tracked.has(response.request())) return;
    const category = classify(response.url());
    try {
      const body = await response.body();
      result.categories[category].requests += 1;
      result.categories[category].bytes += body.byteLength;
      result.total.requests += 1;
      result.total.bytes += body.byteLength;
    } catch { /* response may be unavailable after connection close */ }
  });
};
attach(manager); attach(driver);
const login = async (context, userEmail) => {
  const response = await context.request.post('/api/login/', { data: { email: userEmail, password }, headers: { Origin: baseURL } });
  if (!response.ok()) throw new Error(`login failed for ${userEmail}: ${response.status()}`);
};
await login(manager, email);
await login(driver, process.env.EGRESS3_DRIVER_EMAIL || 'driver-a@smartmanage-demo.com');
const workspaces = await manager.request.get('/api/workspaces');
const workspaceData = await workspaces.json();
const workspaceId = process.env.EGRESS3_WORKSPACE_ID || workspaceData.workspaces?.[0]?.id || workspaceData[0]?.id;
if (!workspaceId) throw new Error('No seeded workspace available');
const managerHome = await manager.newPage();
const managerWorkspace = await manager.newPage();
const driverTrips = await driver.newPage();
const driverDocuments = await driver.newPage();
await Promise.all([
  managerHome.goto('/home/'), managerWorkspace.goto(`/workspace/?id=${encodeURIComponent(workspaceId)}`),
  driverTrips.goto(`/driver-trips/?id=${encodeURIComponent(workspaceId)}`), driverDocuments.goto(`/driver-trips/?id=${encodeURIComponent(workspaceId)}&section=documents`),
]);
await Promise.all([managerHome.waitForLoadState('networkidle'), managerWorkspace.waitForLoadState('networkidle'), driverTrips.waitForLoadState('networkidle'), driverDocuments.waitForLoadState('networkidle')]);
await new Promise((resolve) => setTimeout(resolve, 5000));
result.realtimeHealthy = Boolean(await driverTrips.evaluate(() => Object.values(window.__smartManagePortalRealtimeStatus || {}).some((status) => status === 'SUBSCRIBED')) || await managerHome.evaluate(() => window.__smartManageNotificationRealtimeStatus === 'SUBSCRIBED'));
const start = Date.now();
const markRequest = (request) => { if (request.url().includes('/api/')) tracked.add(request); };
for (const page of [managerHome, managerWorkspace, driverTrips, driverDocuments]) page.on('request', markRequest);
await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));
for (const page of [managerHome, managerWorkspace, driverTrips, driverDocuments]) await page.close();
await manager.close(); await driver.close(); await browser.close();
result.elapsedSeconds = Math.round((Date.now() - start) / 1000);
console.log(JSON.stringify(result, null, 2));
