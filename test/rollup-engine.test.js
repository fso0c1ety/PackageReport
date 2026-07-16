const test = require("node:test");
const assert = require("node:assert/strict");
const { aggregate, lookup, rollup } = require("../server/services/rollupEngine");

const rows = [{ values: { amount: 10, status: "Done" } }, { values: { amount: 20, status: "Working" } }, { values: { amount: 20, status: "Completed" } }];

test("lookup reads related row values", () => assert.deepEqual(lookup(rows, "amount"), [10, 20, 20]));
test("rollups calculate numeric aggregates", () => {
  assert.equal(rollup(rows, "amount", "SUM"), 50);
  assert.equal(rollup(rows, "amount", "AVERAGE"), 50 / 3);
  assert.equal(rollup(rows, "amount", "COUNT_UNIQUE"), 2);
});
test("rollups calculate completion percentage and dates", () => {
  assert.ok(Math.abs(aggregate(lookup(rows, "status"), "PERCENT_COMPLETE") - (200 / 3)) < 1e-10);
  assert.match(aggregate(["2026-01-02", "2026-01-01"], "EARLIEST_DATE"), /^2026-01-01/);
});
