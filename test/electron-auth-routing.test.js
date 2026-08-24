const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(require.resolve(`../${file}`), "utf8");

test("native static routing maps auth routes with trailing slashes to real export files", () => {
  const source = read("src/app/apiUrl.ts");
  assert.equal(source.includes("normalizedPath.replace(/\\/+$/, '')"), true);
  assert.equal(source.includes("return `${nativePath}.html${suffix}`"), true);
});

test("forgot-password static export is present for packaged Electron navigation", () => {
  assert.equal(fs.existsSync("out/forgot-password.html"), true);
});
