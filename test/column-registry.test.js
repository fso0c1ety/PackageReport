const test = require("node:test");
const assert = require("node:assert/strict");
const { COLUMN_TYPES, compareCellValues, matchesFilter, normalizeCellValue, toExportValue, validateCellValue } = require("../server/services/columnRegistry");

test("universal registry includes every Phase 2 column family", () => {
  for (const type of ["MultiSelect", "DateRange", "Lookup", "Rollup", "AutoNumber", "CreatedBy", "LastUpdatedBy"]) assert.ok(COLUMN_TYPES.includes(type));
});

test("money, people, phone and location remain structured", () => {
  assert.deepEqual(normalizeCellValue("Money", "1250", { currency: "EUR" }), { amount: 1250, currency: "EUR" });
  assert.deepEqual(normalizeCellValue("People", { userIds: ["u1", "u1", "u2"] }), { userIds: ["u1", "u2"] });
  assert.equal(normalizeCellValue("Phone", "+383 44 123 456").formatted, "+383 44 123 456");
  assert.equal(normalizeCellValue("Location", { label: "Berlin", latitude: 52.52, longitude: 13.405 }).latitude, 52.52);
});

test("validation catches range, email, website and required errors", () => {
  assert.equal(validateCellValue("Progress", 101).valid, false);
  assert.equal(validateCellValue("Email", "broken").valid, false);
  assert.equal(validateCellValue("Website", "javascript:alert(1)").valid, false);
  assert.equal(validateCellValue("Text", null, { required: true }).valid, false);
  assert.equal(validateCellValue("DateRange", { start: "2026-12-01", end: "2026-01-01" }).valid, false);
});

test("structured values export predictably and numeric values sort numerically", () => {
  assert.equal(toExportValue("Money", { amount: 1250, currency: "EUR" }), "1250 EUR");
  assert.equal(toExportValue("Tags", { values: ["Urgent", "Client"] }), "Urgent, Client");
  assert.ok(compareCellValues("Money", { amount: 20 }, { amount: 100 }) < 0);
});

test("generic filtering works for structured, text, numeric and date values", () => {
  assert.equal(matchesFilter("Money", { amount: 200, currency: "EUR" }, "greater_than", { amount: 100, currency: "EUR" }), true);
  assert.equal(matchesFilter("Tags", { values: ["Urgent", "Client"] }, "contains", "urgent"), true);
  assert.equal(matchesFilter("Text", "AGS Logistics", "does_not_contain", "dental"), true);
  assert.equal(matchesFilter("Date", "2026-07-16", "date_after", "2026-07-01"), true);
  assert.equal(matchesFilter("Email", null, "is_empty", null), true);
});
