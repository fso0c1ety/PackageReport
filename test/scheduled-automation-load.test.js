const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

process.env.JWT_SECRET ||= "scheduled-automation-test-secret-with-adequate-length";
const { schedulerToken, triggerScheduledAutomations, startScheduledAutomationJob } = require("../server/jobs/scheduledAutomations");

const read = (...parts) => readFileSync(join(process.cwd(), ...parts), "utf8");

test("clients never execute scheduled automations", () => {
  const sidebar = read("src", "app", "Sidebar.tsx");
  assert.doesNotMatch(sidebar, /automation\/due/);
  assert.match(sidebar, /requestInFlight/);
  assert.match(sidebar, /calendar-events\/reminders/);
});

test("the existing backend scheduler is the single controlled scheduled automation trigger", () => {
  const job = read("server", "jobs", "scheduledAutomations.js");
  const server = read("server", "server.js");
  assert.match(job, /createHmac\("sha256"/);
  assert.match(job, /setInterval\(run, intervalMs\)/);
  assert.match(job, /if \(inFlight\) return/);
  assert.match(server, /startScheduledAutomationJob/);
  const route = read("src", "app", "api", "automation", "due", "route.js");
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /SCHEDULER_PURPOSE/);
  assert.match(route, /already-running/);
  assert.match(route, /scheduler_locks/);
  assert.match(route, /isLegacyClientRequest/);
  assert.match(route, /new NextResponse\(null, \{ status: 204 \}\)/);
});

test("legacy browser scheduler calls are harmless no-ops instead of auth-refresh triggers", () => {
  const route = read("src", "app", "api", "automation", "due", "route.js");
  assert.match(route, /supplied\.split\("\."\)\.length === 3/);
  assert.match(route, /if \(isLegacyClientRequest\(req\)\) return new NextResponse\(null, \{ status: 204 \}\)/);
  assert.match(route, /return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/);
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

test("the backend runner authenticates without exposing the server secret", async () => {
  let request;
  const result = await triggerScheduledAutomations({
    env: { APP_URL: "https://example.test/" },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ checked: 0, triggered: [] }) };
    },
  });
  assert.deepEqual(result, { checked: 0, triggered: [] });
  assert.equal(request.url, "https://example.test/api/automation/due");
  assert.equal(request.options.headers.authorization, `Bearer ${schedulerToken()}`);
  assert.doesNotMatch(request.options.headers.authorization, new RegExp(process.env.JWT_SECRET));
});

test("the backend runner coalesces overlapping timer executions", async () => {
  let calls = 0;
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const stop = startScheduledAutomationJob({
    logger: { info() {}, error() {} },
    fetchImpl: async () => {
      calls += 1;
      await pending;
      return { ok: true, json: async () => ({ checked: 0, triggered: [] }) };
    },
    env: { APP_URL: "https://example.test" },
  }, 5);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(calls, 1);
  finish();
  stop();
});
