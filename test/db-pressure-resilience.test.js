const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const read = (...parts) => readFileSync(join(process.cwd(), ...parts), "utf8");

test("database pool keeps max capped at two and waits up to fifteen seconds by default", () => {
  const source = read("src", "app", "api", "_lib", "server.js");
  assert.match(source, /max:\s*boundedPositiveInteger\(process\.env\.DATABASE_POOL_MAX, 2, 2\)/);
  assert.match(source, /connectionTimeoutMillis:\s*boundedPositiveInteger\(process\.env\.DATABASE_CONNECTION_TIMEOUT_MS, 15000, 15000\)/);
  assert.match(source, /DB_POOL_ACQUIRE_TIMEOUT/);
  assert.match(source, /totalCount/);
  assert.match(source, /idleCount/);
  assert.match(source, /waitingCount/);
});

test("notification fallback polling yields to healthy realtime and recovers on channel failure", () => {
  const source = read("src", "app", "TopBar.tsx");
  assert.match(source, /status === "SUBSCRIBED"/);
  assert.match(source, /clearInterval\(fallbackInterval\)/);
  assert.match(source, /CHANNEL_ERROR.*TIMED_OUT.*CLOSED/);
  assert.match(source, /setInterval\(fetchNotifications, 90000\)/);
});
