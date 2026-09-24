import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const read = (...parts) => fs.readFileSync(new URL(parts.join("/"), root), "utf8");

test("professional invitations validate recipient identity and inviter grant authority", () => {
  const route = read("src", "app", "api", "tables", "[tableId]", "invite", "route.js");
  assert.match(route, /SELECT id, email FROM users/);
  assert.match(route, /Recipient identity does not match/);
  assert.match(route, /workspaceRank/);
  assert.match(route, /boardRank/);
  assert.match(route, /Inviter cannot grant that workspace role/);
  assert.match(route, /Inviter cannot grant that board role/);
  assert.match(route, /Record access exceeds the selected professional portal/);
});

test("professional invitation schema prevents duplicate pending grants", () => {
  const migration = read("server", "db", "migrations", "033_professional_invitations.sql");
  assert.match(migration, /professional_invitations/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS professional_invitations_pending_unique_idx/);
  assert.match(migration, /WHERE status = 'pending'/);
});

test("invite acceptance remains transactional and scoped to the recipient", () => {
  const route = read("src", "app", "api", "notifications", "[id]", "accept", "route.js");
  assert.match(route, /recipient_id = \$2/);
  assert.match(route, /status='pending'/);
  assert.match(route, /await client\.query\("BEGIN"\)/);
  assert.match(route, /status='accepted'/);
  assert.match(route, /await client\.query\("COMMIT"\)/);
});

test("post-commit audit failure cannot turn a durable invite into a 500", () => {
  const route = read("src", "app", "api", "tables", "[tableId]", "invite", "route.js");
  assert.match(route, /await client\.query\("COMMIT"\)[\s\S]*?client\.release\(\)/);
  assert.match(route, /try \{[\s\S]*?await writeAuditLog\([\s\S]*?\} catch \(auditError\)/);
  assert.match(route, /Audit log failed after invite commit/);
});
