const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeActivityLogTimestamp } = require("../server/utils/activityLogTimestamp.cjs");

const instant = new Date("2026-08-20T11:59:31.970Z");

test("activity log timestamp uses epoch milliseconds for legacy BIGINT schemas", () => {
  assert.equal(normalizeActivityLogTimestamp("bigint", instant), 1787227171970);
});

test("activity log timestamp uses a UTC Date for TIMESTAMPTZ schemas", () => {
  const value = normalizeActivityLogTimestamp("timestamp with time zone", instant);
  assert.ok(value instanceof Date);
  assert.equal(value.toISOString(), "2026-08-20T11:59:31.970Z");
});

test("activity log timestamp rejects invalid instants", () => {
  assert.throws(() => normalizeActivityLogTimestamp("bigint", "not-a-date"), /Invalid activity log timestamp/);
});
