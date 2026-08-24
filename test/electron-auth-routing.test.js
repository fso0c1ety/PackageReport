const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(require.resolve(`../${file}`), "utf8");

test("native static routing maps auth routes with trailing slashes to real export files", () => {
  const source = read("src/app/apiUrl.ts");
  assert.equal(source.includes("normalizedPath.replace(/\\/+$/, '')"), true);
  assert.equal(source.includes("return `${nativePath}.html${suffix}`"), true);
});

test("forgot-password route is covered by the static export contract", () => {
  const source = read("src/app/(auth)/forgot-password/page.tsx");
  assert.match(source, /export default function ForgotPasswordPage/);
  assert.equal(fs.existsSync("src/app/(auth)/forgot-password/page.tsx"), true);
});
