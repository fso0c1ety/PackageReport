const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("public web landing remains visible and authenticated users get an explicit app CTA", () => {
  const page = fs.readFileSync(require.resolve("../src/app/page.tsx"), "utf8");
  const header = fs.readFileSync(require.resolve("../src/app/PublicHeader.tsx"), "utf8");
  assert.doesNotMatch(page, /if \(hasToken\)[\s\S]{0,180}redirectToAppRoute/);
  assert.match(page, /<PublicHeader/);
  assert.match(header, /Open Smart Manage/);
  assert.match(header, /Public navigation/);
  assert.match(page, /Capacitor\.isNativePlatform\(\) \|\| isElectronRuntime\(\)/);
});

test("landing communicates universal product, templates, security and honest FAQ", () => {
  const page = fs.readFileSync(require.resolve("../src/app/page.tsx"), "utf8");
  const catalog = fs.readFileSync(require.resolve("../src/workspaceTemplates.ts"), "utf8");
  assert.match(page, /WORKSPACE_TEMPLATES/);
  for (const text of ["CRM & Sales", "Logistics - Fleet Management"]) assert.equal(catalog.includes(text), true, `missing ${text} from catalog`);
  for (const text of ["ONE WORKSPACE. EVERY PROCESS.", "Role-based access", "Frequently asked questions"])
    assert.equal(page.includes(text), true, `missing ${text}`);
});

test("major marketing screenshot assignments are unique", () => {
  const registry = fs.readFileSync(require.resolve("../src/app/marketingScreenshots.ts"), "utf8");
  const images = [...registry.matchAll(/:\s*"(\/marketing\/[^"]+\.webp)"/g)].map((match) => match[1]);
  assert.ok(images.length >= 8);
  assert.equal(new Set(images).size, images.length);
});
