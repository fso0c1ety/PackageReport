const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("hosted API source contains no credential or JWT secret fallback", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "app", "api", "_lib", "server.js"),
    "utf8",
  );
  assert.doesNotMatch(source, /postgresql:\/\//i);
  assert.doesNotMatch(source, /your_secret_key/i);
  assert.match(source, /process\.env\.DATABASE_URL/);
  assert.match(source, /process\.env\.JWT_SECRET/);
  assert.match(source, /Missing required environment variable: DATABASE_URL/);
});
