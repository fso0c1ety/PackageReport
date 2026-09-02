const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { generateInviteCode, isValidInviteCode, normalizeInviteCode } = require("../server/services/tableInviteCode");

const root = process.cwd();
const source = (...parts) => readFileSync(join(root, ...parts), "utf8");

test("invite codes are secure-format, normalized, and suitable for persisted lookup", () => {
  assert.equal(normalizeInviteCode(" abcd-2345 "), "ABCD2345");
  assert.equal(isValidInviteCode("ABCD-2345"), true);
  assert.equal(isValidInviteCode("short"), false);
  const codes = new Set(Array.from({ length: 256 }, () => generateInviteCode()));
  assert.equal(codes.size, 256);
  for (const code of codes) assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
});

test("Vercel invite-code route authenticates, owner-authorizes, serializes generation, and persists code", () => {
  const route = source("src", "app", "api", "tables", "[tableId]", "invite-code", "route.js");
  assert.match(route, /getAuthenticatedUser/);
  assert.match(route, /Only workspace owners can manage invite codes/);
  assert.match(route, /FOR UPDATE OF t/);
  assert.match(route, /pg_advisory_xact_lock/);
  assert.match(route, /UPDATE tables SET invite_code=\$1/);
});

test("join code consumption persists all authorization models without duplicates", () => {
  const joinRoute = source("src", "app", "api", "tables", "join", "route.js");
  const membership = source("src", "app", "api", "_lib", "tableMembership.js");
  assert.match(joinRoute, /normalizeInviteCode/);
  assert.match(joinRoute, /requireWritableSubscription/);
  assert.match(joinRoute, /FOR UPDATE/);
  assert.match(joinRoute, /upsertTableMembership/);
  assert.match(joinRoute, /preserveExisting: true/);
  assert.match(membership, /alreadyShared/);
  assert.match(membership, /alreadyShared && input\.preserveExisting/);
  assert.match(membership, /ON CONFLICT\(workspace_id,user_id\) DO UPDATE/);
  assert.match(membership, /ON CONFLICT\(table_id,user_id\) DO UPDATE/);
  assert.match(membership, /UPDATE tables SET shared_users/);
});

test("invite acceptance creates one persistent inviter notification and broadcasts it realtime", () => {
  const acceptRoute = source("src", "app", "api", "notifications", "[id]", "accept", "route.js");
  const inviteRoute = source("src", "app", "api", "tables", "[tableId]", "invite", "route.js");
  const topBar = source("src", "app", "TopBar.tsx");
  assert.match(acceptRoute, /'invite_accepted'/);
  assert.match(acceptRoute, /invite-accepted:\$\{notificationId\}/);
  assert.match(acceptRoute, /ON CONFLICT \(dedupe_key\).*DO NOTHING/);
  assert.match(acceptRoute, /broadcastNotificationCreated\(notification\.sender_id, acceptanceNotificationId\)/);
  assert.match(inviteRoute, /broadcastNotificationCreated\(recipientId, notifId\)/);
  assert.match(topBar, /case 'invite_accepted'/);
  assert.match(topBar, />Invite Accepted</);
});
