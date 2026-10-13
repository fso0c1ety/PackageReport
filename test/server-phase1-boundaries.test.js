const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const serverSource = fs.readFileSync(path.join(__dirname, "..", "server", "server.js"), "utf8");
const nexusSource = fs.readFileSync(path.join(__dirname, "..", "src", "app", "api", "nexus", "chat", "route.js"), "utf8");

test("server composition contains no inline domain API handlers", () => {
  assert.doesNotMatch(serverSource, /app\.(?:get|post|put|patch|delete)\(['"]\/api\//);
});

test("server composition uses structured logging instead of raw console output", () => {
  assert.doesNotMatch(serverSource, /console\.(?:log|info|warn|error)\(/);
});

test("startup schema compatibility is explicitly gated", () => {
  assert.match(serverSource, /RUN_STARTUP_MIGRATIONS === ['"]true['"]/);
  assert.match(serverSource, /RUN_STARTUP_MIGRATIONS is disabled in production/);
  assert.match(serverSource, /VERCEL_ENV/);
  assert.match(serverSource, /legacy_schema_migration_failed/);
});

test("Nexus server route never falls back to a public OpenAI key", () => {
  assert.match(nexusSource, /process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(nexusSource, /process\.env\.NEXT_PUBLIC_OPENAI_API_KEY/);
});
