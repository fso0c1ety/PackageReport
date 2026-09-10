const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const read = (...parts) => readFileSync(join(process.cwd(), ...parts), "utf8");

test("clients never execute scheduled automations", () => {
  const sidebar = read("src", "app", "Sidebar.tsx");
  assert.doesNotMatch(sidebar, /automation\/due/);
  assert.match(sidebar, /requestInFlight/);
  assert.match(sidebar, /calendar-events\/reminders/);
});

test("Vercel cron is the single controlled scheduled automation trigger", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.deepEqual(config.crons, [{ path: "/api/automation/due", schedule: "* * * * *" }]);
  const route = read("src", "app", "api", "automation", "due", "route.js");
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /already-running/);
  assert.match(route, /scheduler_locks/);
});

test("scheduled automation requests contain no runtime DDL and filter candidates in SQL", () => {
  const route = read("src", "app", "api", "automation", "due", "route.js");
  assert.doesNotMatch(route, /CREATE TABLE|ALTER TABLE|CREATE (?:UNIQUE )?INDEX/i);
  assert.match(route, /WITH configured AS/);
  assert.match(route, /scheduled_at<=NOW\(\)/);
  assert.match(route, /INSERT INTO automation_runs/);
  assert.match(route, /ON CONFLICT \(idempotency_key\) DO NOTHING/);
});

test("client reminder polling is read-only and reminder delivery is scheduler-owned", () => {
  const reminderRoute = read("src", "app", "api", "calendar-events", "reminders", "route.js");
  assert.doesNotMatch(reminderRoute, /\b(?:UPDATE|INSERT|ALTER|CREATE|DELETE)\b/i);
  const scheduler = read("src", "app", "api", "automation", "due", "route.js");
  assert.match(scheduler, /processCalendarReminders/);
  assert.match(scheduler, /UPDATE calendar_events/);
  assert.match(scheduler, /INSERT INTO notifications/);
});

test("scheduled automation DDL lives in the production migration path", () => {
  const migration = read("server", "db", "migrations", "032_scheduled_automation_runtime.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS scheduler_locks/);
  assert.match(migration, /automation_runs_idempotency_key_idx/);
  assert.match(read("scripts", "vercel-build.js"), /032_scheduled_automation_runtime\.sql/);
});
