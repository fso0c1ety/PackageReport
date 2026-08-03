const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("Phase 11 CI validates unit, type, lint, build and Playwright E2E", () => {
  const workflow = fs.readFileSync(require.resolve("../.github/workflows/quality.yml"), "utf8");
  for (const command of ["npm run typecheck", "npm run lint", "npm test", "npm run build", "npm run test:e2e"]) assert.match(workflow, new RegExp(command));
});

test("critical profession portals have Playwright coverage", () => {
  const portals = fs.readFileSync(require.resolve("../e2e/portals.spec.ts"), "utf8");
  for (const role of ["driver", "doctor", "teacher", "client", "employee", "warehouse"]) assert.match(portals, new RegExp(role));
});
