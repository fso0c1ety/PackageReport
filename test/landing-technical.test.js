const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("landing metadata, robots and sitemap use Smart Manage public identity", () => {
  const layout = fs.readFileSync(require.resolve("../src/app/layout.tsx"), "utf8");
  assert.match(layout, /Smart Manage .* Business Management Platform/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /canonical/);
  assert.match(layout, /\/marketing\/boards\.webp/);
  assert.equal(fs.existsSync(require.resolve("../src/app/robots.ts")), true);
  assert.equal(fs.existsSync(require.resolve("../src/app/sitemap.ts")), true);
});

test("public contact endpoint validates, rate limits and blocks basic bots", () => {
  const route = fs.readFileSync(require.resolve("../src/app/api/contact/route.js"), "utf8");
  assert.match(route, /recent.length >= 5/);
  assert.match(route, /body.website/);
  assert.match(route, /startedAt/);
  assert.match(route, /sendEmail/);
  const page = fs.readFileSync(require.resolve("../src/app/page.tsx"), "utf8");
  assert.match(page, /smartmanage:analytics/);
  assert.match(page, /fetch\("\/api\/contact\/"/);
  assert.match(page, /emailjs\.send/);
  assert.match(page, /template_iruhxjw/);
  assert.match(page, /NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE_ID/);
  assert.match(page, /fetch\("\/api\/contact\//);
});
