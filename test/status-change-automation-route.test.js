const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const routePath = join(root, "src", "app", "api", "tables", "[tableId]", "tasks", "[taskId]", "cells", "[columnId]", "route.js");

test("real workspace cell updates dispatch the persisted row change to the automation engine", () => {
  const source = readFileSync(routePath, "utf8");
  assert.match(source, /automationEngine\.runForRowChange/);
  assert.match(source, /oldValues/);
  assert.match(source, /newValues/);
  assert.match(source, /eventType:\s*"row_updated"/);
  assert.match(source, /eventId/);
  assert.match(source, /actorId:\s*String\(user\.id\)/);
  assert.ok(source.indexOf("UPDATE rows SET") < source.indexOf("automationEngine.runForRowChange"), "automation must run only after persistence succeeds");
});

test("real workspace cell updates retain authorized persistence and realtime invalidation", () => {
  const source = readFileSync(routePath, "utf8");
  assert.match(source, /requireRowPermission/);
  assert.match(source, /requireWritableSubscription/);
  assert.match(source, /broadcastTableInvalidation/);
  assert.match(source, /automationEventId:\s*eventId/);
});
