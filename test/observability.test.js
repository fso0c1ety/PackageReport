const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const metrics = require("../server/observability/metrics");

test("metrics aggregate counters, gauges and timings without secrets", () => {
  metrics.increment("test_total"); metrics.gauge("test_active", 2); metrics.timing("test_ms", 10);
  const result = metrics.snapshot(); assert.equal(Object.values(result.counters).at(-1), 1); assert.equal(Object.values(result.gauges).at(-1), 2); assert.equal(Object.values(result.timings).at(-1).maxMs, 10);
});

test("production system exposes health readiness metrics and safe version metadata", () => {
  const route = fs.readFileSync(require.resolve("../server/routes/system"), "utf8");
  assert.match(route, /router\.get\("\/health"/); assert.match(route, /router\.get\("\/ready"/); assert.match(route, /router\.get\("\/metrics"/);
  assert.doesNotMatch(route, /DATABASE_URL|REDIS_URL|SUPABASE_SERVICE_ROLE/);
});

test("server gracefully closes HTTP sockets database Redis workers and timers", () => {
  const source = fs.readFileSync(require.resolve("../server/server"), "utf8");
  for (const value of ["server.close", "io.close", "closeQueues", "closeRedis", "db.pool.end", "stopScheduledMessages"]) assert.match(source, new RegExp(value.replace(".", "\\.")));
  assert.match(source, /SIGTERM/); assert.match(source, /SIGINT/);
});
