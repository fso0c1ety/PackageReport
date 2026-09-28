const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("contextual back uses a real anchor destination", () => {
  const source = fs.readFileSync("src/app/ContextualBack.tsx", "utf8");
  assert.match(source, /component=\"a\"/);
  assert.match(source, /href=\{destination\}/);
});
