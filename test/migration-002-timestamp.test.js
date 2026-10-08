const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("migration 002 supplies a timestamp to tables.created_at", () => {
  const sql = fs.readFileSync("server/db/migrations/002_backfill_empty_workspaces.sql", "utf8");
  assert.match(sql, /INSERT INTO tables[\s\S]*created_at/);
  assert.match(sql, /\n\s+NOW\(\),\n/);
  assert.doesNotMatch(sql, /EXTRACT\(EPOCH FROM NOW\(\)\)\s*\*\s*1000/);
});

test("migration 002 remains additive and idempotent for existing workspaces", () => {
  const sql = fs.readFileSync("server/db/migrations/002_backfill_empty_workspaces.sql", "utf8");
  assert.match(sql, /FROM workspaces w/);
  assert.match(sql, /WHERE NOT EXISTS \([\s\S]*tables t WHERE t\.workspace_id = w\.id/);
  assert.doesNotMatch(sql, /UPDATE workspaces|DELETE FROM|DROP TABLE|ALTER TABLE/);
});
