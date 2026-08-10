const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const publicApi = readFileSync(join(root, "src", "app", "api", "demo-requests", "route.js"), "utf8");
const adminApi = readFileSync(join(root, "src", "app", "api", "internal", "demo-requests", "route.js"), "utf8");

test("demo request API validates abuse controls and persists before email", () => {
  assert.match(publicApi, /body\.website/);
  assert.match(publicApi, /startedAt/);
  assert.match(publicApi, /Too many requests/);
  assert.match(publicApi, /INSERT INTO demo_requests/);
  assert.ok(publicApi.indexOf("INSERT INTO demo_requests") < publicApi.indexOf("Promise.allSettled"));
  assert.match(publicApi, /escapeHtml/);
  assert.doesNotMatch(publicApi, /BREVO_API_KEY\s*=|SMTP_PASSWORD\s*=/);
});

test("internal demo administration requires platform permissions", () => {
  assert.match(adminApi, /platform_staff_roles/);
  assert.match(adminApi, /demo_requests\.read/);
  assert.match(adminApi, /demo_requests\.manage/);
  assert.doesNotMatch(adminApi, /workspace_admin|owner_id/);
});
