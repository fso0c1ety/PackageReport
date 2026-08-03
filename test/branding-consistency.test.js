const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("user-facing branding is Smart Manage across landing and authentication", () => {
  const login = fs.readFileSync(require.resolve("../src/app/(auth)/LoginForm.tsx"), "utf8");
  const landing = fs.readFileSync(require.resolve("../src/app/page.tsx"), "utf8");
  assert.doesNotMatch(login, /PackageReport/); assert.match(login, /Smart Manage/);
  assert.doesNotMatch(landing, /PackageReport logo|PackageReport can fit/);
});

test("PWA, native and theme branding use shared Smart Manage identity", () => {
  const manifest = fs.readFileSync(require.resolve("../src/app/manifest.ts"), "utf8");
  const capacitor = fs.readFileSync(require.resolve("../capacitor.config.ts"), "utf8");
  const css = fs.readFileSync(require.resolve("../src/app/globals.css"), "utf8");
  assert.match(manifest, /name: "Smart Manage"/); assert.match(capacitor, /appName: 'Smart Manage'/);
  assert.match(css, /--sm-brand/); assert.match(css, /\[data-theme="dark"\]/);
});
