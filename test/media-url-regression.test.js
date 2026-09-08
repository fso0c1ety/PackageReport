const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const apiUrl = readFileSync(join(process.cwd(), "src", "app", "apiUrl.ts"), "utf8");

test("protected upload URLs stay same-origin for authenticated media rendering", () => {
  assert.match(apiUrl, /if \(normalizedPath\.startsWith\('\/uploads\/'\)\)/);
  assert.match(apiUrl, /return normalizedPath;/);
  assert.doesNotMatch(apiUrl, /const supabaseStorageUrl = resolveSupabaseStorageUrl\(avatar\)/);
});

test("media URL handling does not weaken protected upload access", () => {
  const uploadRoute = readFileSync(
    join(process.cwd(), "src", "app", "uploads", "[filename]", "route.js"),
    "utf8",
  );
  assert.match(uploadRoute, /getAuthenticatedUser\(req\)/);
  assert.match(uploadRoute, /requireFilePermission\(pool, user\.id/);
  assert.match(uploadRoute, /createSignedUrl/);
});