import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const password = process.env.EGRESS4_PASSWORD;
if (!password) throw new Error('EGRESS4_PASSWORD is required');

const context = await chromium.launchPersistentContext('', { headless: true });
const login = await context.request.post(`${baseUrl}/api/login/`, {
  data: { email: 'egress4-user@example.test', password },
});
if (!login.ok()) throw new Error(`login failed: ${login.status()}`);
const body = await login.json();
await context.setExtraHTTPHeaders({ Authorization: `Bearer ${body.token}` });
await context.addInitScript(({ token, user }) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}, { token: body.token, user: body.user });

const page = await context.newPage();
const responses = [];
page.on('response', (response) => {
  if (response.url().includes('/api/notifications')) responses.push(response);
});
await page.goto(`${baseUrl}/home/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.localStorage.getItem('token'));
await page.waitForFunction(() => window.__smartManageNotificationRealtimeStatus === 'SUBSCRIBED', null, { timeout: 30000 });
const topicResponse = await context.request.get(`${baseUrl}/api/notifications/realtime-topic`);
if (!topicResponse.ok()) throw new Error(`topic failed: ${topicResponse.status()}`);
const { topic } = await topicResponse.json();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const sender = supabase.channel(topic);
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('sender timeout')), 20000);
  sender.subscribe((status) => {
    if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); }
    if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) { clearTimeout(timeout); reject(new Error(status)); }
  });
});

const results = {};
for (const count of [1, 10, 50]) {
  responses.length = 0;
  await page.evaluate(() => {
    window.__smartManageNotificationRealtimeEvents = 0;
    window.__smartManageNotificationRefreshCount = 0;
  });
  const started = Date.now();
  for (let i = 0; i < count; i += 1) {
    const result = await sender.send({ type: 'broadcast', event: `notification:${topic}`, payload: { topic, notificationId: `egress4-burst-${count}-${i}` } });
    if (result !== 'ok') throw new Error(`broadcast failed: ${result}`);
  }
  const hasEventDiagnostic = await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, '__smartManageNotificationRealtimeEvents'));
  if (hasEventDiagnostic) {
    await page.waitForFunction((expected) => Number(window.__smartManageNotificationRealtimeEvents || 0) >= expected, count, { timeout: 30000 });
  } else {
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(1000);
  let bytes = 0;
  for (const response of responses) {
    const buffer = await response.body().catch(() => null);
    if (buffer) bytes += buffer.length;
  }
  results[count] = {
    eventsSent: count,
    eventsReceived: hasEventDiagnostic
      ? await page.evaluate(() => Number(window.__smartManageNotificationRealtimeEvents || 0))
      : responses.length,
    refreshes: await page.evaluate(() => Number(window.__smartManageNotificationRefreshCount || 0)),
    requests: responses.length,
    bytes,
    runtimeMs: Date.now() - started,
  };
}
await Promise.race([
  sender.unsubscribe(),
  new Promise((resolve) => setTimeout(resolve, 2000)),
]);
await Promise.race([
  context.close(),
  new Promise((resolve) => setTimeout(resolve, 3000)),
]);
console.log(JSON.stringify({ realtime: results }));
