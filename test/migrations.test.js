const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { checksum, validateMigrationFiles } = require("../server/db/migrationUtils");

test("migration checksums are stable and detect edits", () => {
  assert.equal(checksum("SELECT 1"), checksum("SELECT 1"));
  assert.notEqual(checksum("SELECT 1"), checksum("SELECT 2"));
});

test("migration validation rejects duplicate sequence numbers", () => {
  assert.throws(
    () => validateMigrationFiles(["010_first.sql", "010_second.sql"]),
    /Duplicate migration sequence/,
  );
});

test("migration validation accepts ordered unique files", () => {
  assert.equal(validateMigrationFiles(["001_first.sql", "002_second.sql"]), true);
});

test("production migration runner supports an explicit safe target", () => {
  const source = readFileSync(join(process.cwd(), "server", "db", "runMigrations.js"), "utf8");
  const vercelBuild = readFileSync(join(process.cwd(), "scripts", "vercel-build.js"), "utf8");
  assert.match(source, /MIGRATION_TARGET/);
  assert.match(vercelBuild, /VERCEL_ENV === 'production'/);
  assert.match(vercelBuild, /020_account_security\.sql/);
});

test("tenant file security migration is included in production deploys", () => {
  const source = readFileSync(join(process.cwd(), "scripts", "vercel-build.js"), "utf8");
  assert.match(source, /021_tenant_file_security\.sql/);
  const migration = readFileSync(join(process.cwd(), "server", "db", "migrations", "021_tenant_file_security.sql"), "utf8");
  assert.match(migration, /uploaded_by TEXT/);
  assert.match(migration, /table_id TEXT/);
  assert.match(migration, /row_id TEXT/);
});

test("universal role and portal migration is included in production deploys", () => {
  const source = readFileSync(join(process.cwd(), "scripts", "vercel-build.js"), "utf8");
  assert.match(source, /022_universal_roles_and_portals\.sql/);
  const migration = readFileSync(join(process.cwd(), "server", "db", "migrations", "022_universal_roles_and_portals.sql"), "utf8");
  for (const field of ["workspace_role", "job_roles", "portal_type", "record_access", "board_member_access", "workspace_job_roles"]) assert.match(migration, new RegExp(field));
  assert.match(migration, /smart_manage_row_visible/);
});

test("template portal preset migration is included in production deploys", () => {
  const buildScript = readFileSync(join(process.cwd(), "scripts", "vercel-build.js"), "utf8");
  assert.match(buildScript, /023_template_portal_presets\.sql/);
  const migration = readFileSync(join(process.cwd(), "server", "db", "migrations", "023_template_portal_presets.sql"), "utf8");
  assert.match(migration, /primary_job_role/);
  assert.match(migration, /permitted_portals/);
});

test("invoice registry migration is included in production deploys", () => {
  const buildScript = readFileSync(join(process.cwd(), "scripts", "vercel-build.js"), "utf8");
  assert.match(buildScript, /030_invoice_registry\.sql/);
});
