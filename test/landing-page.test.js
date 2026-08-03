const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("public web landing remains visible and authenticated users get an explicit app CTA", () => {
  const page = fs.readFileSync(require.resolve("../src/app/page.tsx"), "utf8");
  assert.doesNotMatch(page, /if \(hasToken\)[\s\S]{0,180}redirectToAppRoute/);
  assert.match(page, /Open Smart Manage/);
  assert.match(page, /Capacitor\.isNativePlatform\(\) \|\| isElectronRuntime\(\)/);
});

test("landing communicates universal product, templates, security and honest FAQ", () => {
  const page = fs.readFileSync(require.resolve("../src/app/page.tsx"), "utf8");
  for (const text of ["ONE WORKSPACE. EVERY PROCESS.", "CRM & Sales", "Logistics — Fleet Management", "Role-based access", "Frequently asked questions"])
    assert.equal(page.includes(text), true, `missing ${text}`);
});
