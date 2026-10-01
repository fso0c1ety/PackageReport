import { chromium } from 'playwright';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const email = process.env.EGRESS3_EMAIL || 'portal-manager@smartmanage-demo.com';
const password = process.env.EGRESS3_PASSWORD || process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;
const durationSeconds = Number(process.env.EGRESS3_DURATION_SECONDS || 600);
if (!password) throw new Error('EGRESS3_PASSWORD is required');

const result = { durationSeconds, realtimeHealthy: false, driverRealtimeHealthy: false, notificationRealtimeHealthy: false, total: { requests: 0, bytes: 0 }, categories: {
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
let collecting = false;
const diagnostics = { consoleErrors: [], failedRequests: [], browserApiStatuses: [] };
const attach = (page) => {
  page.on('response', async (response) => {
    if (!response.url().includes('/api/')) return;
    if (response.status() === 403 && diagnostics.browserApiStatuses.length < 50) {
      diagnostics.browserApiStatuses.push({ path: new URL(response.url()).pathname, status: response.status() });
    }
    if (!collecting) return;
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
const login = async (context, userEmail) => {
  const response = await context.request.post('/api/login/', { data: { email: userEmail, password }, headers: { Origin: baseURL } });
  if (!response.ok()) throw new Error(`login failed for ${userEmail}: ${response.status()}`);
  const payload = await response.json();
  if (!payload.token) throw new Error(`login returned no session token for ${userEmail}`);
  await context.setExtraHTTPHeaders({ Authorization: `Bearer ${payload.token}` });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token: payload.token, user: payload.user });
  return payload.token;
};
const managerToken = await login(manager, email);
const driverToken = await login(driver, process.env.EGRESS3_DRIVER_EMAIL || 'driver-a@smartmanage-demo.com');
const workspaces = await manager.request.get('/api/workspaces');
const workspaceData = await workspaces.json();
const workspaceId = process.env.EGRESS3_WORKSPACE_ID || workspaceData.workspaces?.[0]?.id || workspaceData[0]?.id || 'egress3-demo-workspace';
const driverAuth = { Authorization: `Bearer ${driverToken}` };
const managerAuth = { Authorization: `Bearer ${managerToken}` };
const tripsResponse = await driver.request.get(`/api/logistics/driver/trips?workspaceId=${encodeURIComponent(workspaceId)}`, { headers: driverAuth });
const tripsPayload = await tripsResponse.json().catch(() => ({}));
if (!tripsResponse.ok() || !Array.isArray(tripsPayload.trips) || tripsPayload.trips.length < 1) {
  throw new Error(`driver trips preflight failed: status=${tripsResponse.status()} trips=${Array.isArray(tripsPayload.trips) ? tripsPayload.trips.length : 0}`);
}
const tripTableId = tripsPayload.trips[0].tableId || tripsPayload.trips[0].table_id;
if (!tripTableId) throw new Error('driver trips preflight returned no tableId');
const driverTopic = await driver.request.get(`/api/tables/${encodeURIComponent(tripTableId)}/realtime-topic`, { headers: driverAuth });
if (!driverTopic.ok()) throw new Error(`driver realtime-topic preflight failed: status=${driverTopic.status()}`);
const notificationTopic = await manager.request.get('/api/notifications/realtime-topic', { headers: managerAuth });
if (!notificationTopic.ok()) throw new Error(`notification realtime-topic preflight failed: status=${notificationTopic.status()}`);
const managerHome = await manager.newPage();
const managerWorkspace = await manager.newPage();
const driverTrips = await driver.newPage();
const driverDocuments = await driver.newPage();
const driverFuel = await driver.newPage();
const driverExpenses = await driver.newPage();
for (const page of [managerHome, managerWorkspace, driverTrips, driverDocuments, driverFuel, driverExpenses]) {
  attach(page);
  page.on('console', (message) => { if (message.type() === 'error' && diagnostics.consoleErrors.length < 20) diagnostics.consoleErrors.push(message.text()); });
  page.on('requestfailed', (request) => { if (diagnostics.failedRequests.length < 20) diagnostics.failedRequests.push(`${request.method()} ${request.url()}`); });
}
await Promise.all([
  managerHome.goto('/home/', { waitUntil: 'domcontentloaded' }), managerWorkspace.goto(`/workspace/?id=${encodeURIComponent(workspaceId)}`, { waitUntil: 'domcontentloaded' }),
  driverTrips.goto(`/driver-trips/?id=${encodeURIComponent(workspaceId)}`, { waitUntil: 'domcontentloaded' }), driverDocuments.goto(`/driver-trips/?id=${encodeURIComponent(workspaceId)}&section=documents`, { waitUntil: 'domcontentloaded' }),
  driverFuel.goto(`/driver-trips/?id=${encodeURIComponent(workspaceId)}&section=fuel`, { waitUntil: 'domcontentloaded' }), driverExpenses.goto(`/driver-trips/?id=${encodeURIComponent(workspaceId)}&section=expenses`, { waitUntil: 'domcontentloaded' }),
]);
await new Promise((resolve) => setTimeout(resolve, 5000));
const browserAuth = {
  manager: await managerHome.evaluate(() => Boolean(localStorage.getItem('token') && localStorage.getItem('user'))),
  driver: await driverTrips.evaluate(() => Boolean(localStorage.getItem('token') && localStorage.getItem('user'))),
};
if (!browserAuth.manager || !browserAuth.driver) throw new Error(`browser auth session missing: ${JSON.stringify(browserAuth)}`);
await driverTrips.waitForFunction(() => Object.values(window.__smartManagePortalRealtimeStatus || {}).some((status) => status === 'SUBSCRIBED'), null, { timeout: 30000 }).catch(() => {});
await managerHome.waitForFunction(() => window.__smartManageNotificationRealtimeStatus === 'SUBSCRIBED', null, { timeout: 30000 }).catch(() => {});
result.driverRealtimeHealthy = Boolean(await driverTrips.evaluate(() => Object.values(window.__smartManagePortalRealtimeStatus || {}).some((status) => status === 'SUBSCRIBED')));
result.notificationRealtimeHealthy = Boolean(await managerHome.evaluate(() => window.__smartManageNotificationRealtimeStatus === 'SUBSCRIBED'));
result.realtimeHealthy = result.driverRealtimeHealthy && result.notificationRealtimeHealthy;
if (!result.realtimeHealthy) {
  const driverTopicPayload = await driverTopic.json().catch(() => ({}));
  const notificationTopicPayload = await notificationTopic.json().catch(() => ({}));
  result.preflight = { browserAuth, tripsStatus: tripsResponse.status(), tripCount: tripsPayload.trips.length, tripTableId, driverTopicStatus: driverTopic.status(), driverTopicPresent: Boolean(driverTopicPayload.topic), notificationTopicStatus: notificationTopic.status(), notificationTopicPresent: Boolean(notificationTopicPayload.topic), driverPageUrl: driverTrips.url(), managerPageUrl: managerHome.url(), portalRealtimeStatus: await driverTrips.evaluate(() => window.__smartManagePortalRealtimeStatus || null), notificationRealtimeStatus: await managerHome.evaluate(() => window.__smartManageNotificationRealtimeStatus || null), diagnostics };
  console.error(JSON.stringify(result.preflight));
  throw new Error('Healthy driver and notification realtime subscriptions required before idle collection');
}
const start = Date.now();
collecting = true;
await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));
for (const page of [managerHome, managerWorkspace, driverTrips, driverDocuments, driverFuel, driverExpenses]) await page.close();
await manager.close(); await driver.close(); await browser.close();
result.elapsedSeconds = Math.round((Date.now() - start) / 1000);
result.diagnostics = diagnostics;
console.log(JSON.stringify(result, null, 2));
