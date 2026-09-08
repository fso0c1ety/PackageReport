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

test("invoice branding persists the company name with logo and stamp", () => {
  assert.match(route, /invoice_company_name TEXT/);
  assert.match(route, /companyName: table\.invoice_company_name \|\| null/);
  assert.match(route, /SET invoice_company_name = \$1, invoice_logo_url = \$2, invoice_stamp_url = \$3/);
});
