const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

test("notification realtime uses an authenticated user-scoped topic and ID-only payload", () => {
  const realtime = read("src", "app", "api", "_lib", "notificationRealtime.js");
  const route = read("src", "app", "api", "notifications", "realtime-topic", "route.js");
  assert.match(realtime, /createHmac\("sha256"/);
  assert.match(realtime, /smart-manage:notifications:/);
  assert.match(realtime, /notificationId: String\(notificationId\)/);
  assert.doesNotMatch(realtime, /data:.*notificationData/);
  assert.match(route, /getAuthenticatedUser/);
  assert.match(route, /getNotificationRealtimeTopic\(user\.id\)/);
});

test("TopBar applies realtime inserts immediately and cleans up the channel", () => {
  const topBar = read("src", "app", "TopBar.tsx");
  assert.match(topBar, /notifications\/realtime-topic/);
  assert.match(topBar, /\.on\("broadcast"/);
  assert.match(topBar, /void fetchNotifications\(\)/);
  assert.match(topBar, /supabase\.removeChannel/);
  assert.match(topBar, /areNotificationsEqual\(prev, sortedData\)/);
  assert.match(topBar, /setUnreadCount/);
});

test("notification persistence broadcasts only after a successful insert", () => {
  const helper = read("src", "app", "api", "_lib", "notificationHelper.js");
  const automation = read("src", "app", "api", "automation", "[tableId]", "[id]", "route.js");
  assert.match(helper, /RETURNING id/);
  assert.match(helper, /broadcastNotificationCreated\(recipientId, inserted\.rows\[0\]\.id\)/);
  assert.match(helper, /Promise\.allSettled\(realtimeBroadcasts\)/);
  assert.match(automation, /broadcastNotificationCreated\(recipient\.id, notificationId\)/);
  assert.match(automation, /Promise\.allSettled\(realtimeBroadcasts\)/);
});
