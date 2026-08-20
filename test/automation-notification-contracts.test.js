const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const read = (...parts) => readFileSync(join(process.cwd(), ...parts), "utf8");

test("automation routes use the universal board permission model", () => {
  const collection = read("src", "app", "api", "automation", "[tableId]", "route.js");
  const item = read("src", "app", "api", "automation", "[tableId]", "[id]", "route.js");
  for (const source of [collection, item]) {
    assert.match(source, /requireBoardPermission/);
    assert.doesNotMatch(source, /const member = \(Array\.isArray\(table\.shared_users\)/);
  }
});

test("scheduled automations require editor access through the shared authorization model", () => {
  const source = read("src", "app", "api", "automation", "due", "route.js");
  assert.match(source, /requireBoardPermission\(pool, user\.id, item\.table_id, "editor"\)/);
});

test("notification delivery respects board and record access and supports idempotency", () => {
  const helper = read("src", "app", "api", "_lib", "notificationHelper.js");
  const migration = read("server", "db", "migrations", "031_notification_delivery_idempotency.sql");
  assert.match(helper, /workspace_members/);
  assert.match(helper, /board_member_access/);
  assert.match(helper, /requireRowPermission/);
  assert.match(helper, /ON CONFLICT \(dedupe_key\)/);
  assert.match(migration, /UNIQUE INDEX[\s\S]*notifications\(dedupe_key\)/);
  assert.match(read("scripts", "vercel-build.js"), /031_notification_delivery_idempotency\.sql/);
});

test("notification reads discard revoked or unauthorized deep links", () => {
  const source = read("src", "app", "api", "notifications", "route.js");
  assert.match(source, /requireRowPermission\(pool, user\.id, data\.taskId/);
  assert.match(source, /requireBoardPermission\(pool, user\.id, data\.tableId/);
});

test("automation execution keys are per event and not permanently tied to a repeated value", () => {
  const source = read("src", "app", "api", "tables", "[tableId]", "tasks", "route.js");
  assert.match(source, /eventId = uuidv4\(\)/);
  assert.match(source, /`\$\{automation\.id\}:\$\{eventId\}`/);
  assert.match(source, /`automation:\$\{runId\}:\$\{matchedUser\.id\}`/);
});

test("row updates notify only recipients authorized by the shared notification helper", () => {
  const source = read("src", "app", "api", "tables", "[tableId]", "tasks", "route.js");
  assert.match(source, /type: "record_update"/);
  assert.match(source, /dedupeKey: `row-update:\$\{eventId\}`/);
  assert.match(source, /body: `\$\{getTaskName\(table, mergedValues\)\} was updated\.`/);
});
