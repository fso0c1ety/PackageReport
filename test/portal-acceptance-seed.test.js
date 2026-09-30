const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const source = readFileSync(join(process.cwd(), "scripts", "seed-portal-acceptance.mjs"), "utf8");
const preparation = readFileSync(join(process.cwd(), "scripts", "prepare-portal-acceptance-env.mjs"), "utf8");

test("portal acceptance seed environment guard distinguishes Preview from Production", async () => {
  const { assertPortalSeedEnvironment } = await import("../scripts/seed-portal-acceptance.mjs");
  assert.throws(() => assertPortalSeedEnvironment({ VERCEL_ENV: "production", NODE_ENV: "production" }), /Refusing portal acceptance seed/);
  assert.doesNotThrow(() => assertPortalSeedEnvironment({ VERCEL_ENV: "preview", NODE_ENV: "production" }));
  assert.doesNotThrow(() => assertPortalSeedEnvironment({ NODE_ENV: "test" }));
  assert.throws(() => assertPortalSeedEnvironment({ NODE_ENV: "production" }), /Refusing portal acceptance seed/);
});

test("portal acceptance environment is prepared without hardcoded secrets", () => {
  assert.match(preparation, /randomBytes/);
  assert.match(preparation, /DEMO_DATABASE_FINGERPRINT/);
  assert.match(preparation, /assertExpectedDatabaseTarget/);
  assert.match(preparation, /\.env\.portal-acceptance\.local/);
  assert.doesNotMatch(preparation, /console\.log\([^\n]*(DATABASE_URL|PASSWORD|fingerprint)/);
});

test("portal acceptance seed is environment-only and demo guarded", () => {
  assert.match(source, /SMART_MANAGE_PORTAL_TEST_PASSWORD/);
  assert.match(source, /verifyDemoDatabaseTarget/);
  assert.match(source, /is_demo IS NOT TRUE/);
  assert.match(source, /workspace\?\.is_demo!==true/);
  assert.match(source, /Refusing non-demo workspace/);
  assert.doesNotMatch(source, /Argjendi1|password\s*=\s*["'][^"']+["']/i);
});

test("portal acceptance seed creates isolated A and B identities for every requested role", () => {
  for (const identity of ["driverA","driverB","teacherA","teacherB","parentA","parentB","doctorA","doctorB","patientA","patientB","clientA","clientB"]) assert.match(source, new RegExp(identity));
  assert.match(source, /_assignedDriverUserId/);
  assert.match(source, /_linkedParentUserId/);
  assert.match(source, /_linkedPatientUserId/);
  assert.match(source, /clientCompanyId/);
  assert.doesNotMatch(source, /_clientCompanyId/);
  assert.match(source, /must be at least 24 characters/);
});

test("portal acceptance seed fails closed before database access without a password", () => {
  const env = { ...process.env };
  delete env.SMART_MANAGE_PORTAL_TEST_PASSWORD;
  delete env.DATABASE_URL;
  const result = spawnSync(process.execPath, [join("scripts", "seed-portal-acceptance.mjs")], { cwd: process.cwd(), env, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /SMART_MANAGE_PORTAL_TEST_PASSWORD/);
});

test("portal acceptance seed refuses Production even with otherwise valid credentials", async () => {
  const { assertPortalSeedEnvironment } = await import("../scripts/seed-portal-acceptance.mjs");
  assert.throws(
    () => assertPortalSeedEnvironment({ VERCEL_ENV: "production", NODE_ENV: "production" }),
    /Refusing portal acceptance seed in Production/
  );
});

test("portal CI guard permits only the isolated localhost acceptance database", async () => {
  const { assertPortalCiEnvironment } = await import("../scripts/portal-ci-guard.mjs");
  const base = { CI: "true", PORTAL_ACCEPTANCE_CI: "1", VERCEL_ENV: "" };
  assert.doesNotThrow(() => assertPortalCiEnvironment(base, "postgresql://postgres:local@127.0.0.1:5432/smart_manage_portal_acceptance"));
  assert.throws(() => assertPortalCiEnvironment({ ...base, VERCEL_ENV: "preview" }, "postgresql://postgres:local@127.0.0.1:5432/smart_manage_portal_acceptance"), /refuses Vercel/);
  assert.throws(() => assertPortalCiEnvironment(base, "postgresql://postgres:local@127.0.0.1:5432/other"), /smart_manage_portal_acceptance/);
  assert.throws(() => assertPortalCiEnvironment({ ...base, CI: "false" }, "postgresql://postgres:local@127.0.0.1:5432/smart_manage_portal_acceptance"), /CI=true/);
});
