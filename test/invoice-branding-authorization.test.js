const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const route = readFileSync(
  join(process.cwd(), "src", "app", "api", "tables", "[tableId]", "invoice-branding", "route.js"),
  "utf8",
);

test("invoice branding uses canonical board authorization", () => {
  assert.match(route, /import \{ requireBoardPermission \}/);
  assert.match(route, /getAccessibleTable\(tableId, user\.id, "viewer"\)/);
  assert.match(route, /getAccessibleTable\(tableId, user\.id, "editor"\)/);
  assert.doesNotMatch(route, /jsonb_array_elements\(COALESCE\(t\.shared_users/);
});