const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const brand = require(path.join(root, "config", "brand.json"));
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("official Smart Manage support address is centralized", () => {
  assert.equal(brand.supportEmail, "aximostudioo@gmail.com");
  assert.equal(brand.supportMailto, "mailto:aximostudioo@gmail.com");
});

test("Demo Access contact action and public surfaces use the brand contact", () => {
  const files = [
    "src/app/SubscriptionBanner.tsx",
    "src/app/LandingVisuals.tsx",
    "src/app/pricing/page.tsx",
    "src/app/(dashboard)/settings/page.tsx",
    "src/app/terms/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/refund/page.tsx",
  ];
  for (const file of files) assert.match(read(file), /brand\.support(?:Email|Mailto)/, file);
  assert.match(read(files[0]), /Contact Smart Manage/);
});

test("generated security and demo-ready emails expose the official support link", () => {
  const { buildAccountActionEmail, buildPasswordResetEmail } = require(path.join(root, "server", "utils", "emailTemplates.js"));
  for (const html of [
    buildPasswordResetEmail({ displayName: "Demo", resetUrl: "https://example.test/reset" }),
    buildAccountActionEmail({ displayName: "Demo", actionUrl: "https://example.test/activate", activation: true }),
  ]) {
    assert.match(html, /mailto:aximostudioo@gmail\.com/);
    assert.match(html, /aximostudioo@gmail\.com/);
  }
  assert.match(read("src/app/api/_lib/demoProvisioning.js"), /brand\.supportMailto/);
});

test("obsolete public Smart Manage addresses are absent from user-facing sources", () => {
  const publicRoots = ["src", "server/routes", "server/utils", "electron", "public"];
  const obsolete = /(?:support|billing|privacy)@smart-manage\.app|info@aximostudio\.com/i;
  const visit = (entry) => {
    if (!fs.existsSync(entry)) return;
    const stat = fs.statSync(entry);
    if (stat.isDirectory()) return fs.readdirSync(entry).forEach((name) => visit(path.join(entry, name)));
    if (/\.(?:js|jsx|ts|tsx|json|html|md)$/.test(entry)) assert.doesNotMatch(fs.readFileSync(entry, "utf8"), obsolete, path.relative(root, entry));
  };
  publicRoots.forEach((directory) => visit(path.join(root, directory)));
});
