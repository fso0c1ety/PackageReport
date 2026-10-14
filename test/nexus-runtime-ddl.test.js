const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const route = readFileSync("src/app/api/nexus/chat/route.js", "utf8");
const migration = readFileSync("server/db/migrations/012_ai_assistant.sql", "utf8");

test("Nexus schema is provisioned by migration, never by the request handler", () => {
  assert.doesNotMatch(route, /CREATE TABLE|ALTER TABLE|CREATE (?:UNIQUE )?INDEX/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS ai_action_logs/);
  assert.match(migration, /ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ai_enabled/);
  assert.match(migration, /ai_action_logs_workspace_created_idx/);
});

test("Nexus uses an explicit workspace projection and reports an unprepared schema", () => {
  assert.match(route, /SELECT id,owner_id,ai_enabled,name,template_key FROM workspaces/);
  assert.match(route, /NEXUS_SCHEMA_NOT_READY/);
  assert.match(route, /status: 503/);
});
