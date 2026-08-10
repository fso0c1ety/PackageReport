import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

test("demo provisioning migration defines retry-safe lifecycle state", () => {
  const sql = read("server","db","migrations","028_demo_provisioning_flow.sql");
  for (const field of ["prospect_user_id","provisioned_by","access_email_status","revoked_at","conversion_started_at"]) assert.match(sql, new RegExp(field));
  assert.match(sql, /UNIQUE INDEX[\s\S]*workspaces\(demo_request_id\)/i);
  assert.match(sql, /demo_request_events/);
  assert.match(sql, /smart_manage_demo_write_guard/);
  assert.match(sql, /demo_expires_at<=NOW\(\)/);
  assert.match(sql, /revoked/);
  assert.match(read("scripts","vercel-build.js"), /028_demo_provisioning_flow\.sql/);
});

test("template recommendation uses catalog-backed explicit mappings", () => {
  const source = read("src","app","api","_lib","demoProvisioning.js");
  assert.match(source, /marketing_agency:\s*"marketing_agency"/);
  assert.match(source, /logistics:\s*"freight_broker"/);
  assert.match(source, /fleet:\s*"fleet_management"/);
  assert.match(source, /dental:\s*"dental_clinic"/);
  assert.match(source, /WORKSPACE_TEMPLATES\.some/);
  assert.match(source, /return .* null/);
  assert.match(source, /marketing_agency[\s\S]*marketing_agency/);
});

test("provisioning is isolated, idempotent and seeds relational sample rows", () => {
  const source = read("src","app","api","_lib","demoProvisioning.js");
  assert.match(source, /SELECT \* FROM demo_requests WHERE id=\$1 FOR UPDATE/);
  assert.match(source, /if \(locked\.demo_workspace_id\)/);
  assert.match(source, /is_demo,demo_request_id,demo_expires_at,demo_metadata/);
  assert.match(source, /source: "request_demo"/);
  assert.match(source, /board\.rows\?\.\[0\]/);
  assert.match(source, /__relationBoard/);
  assert.doesNotMatch(source, /demo@smartmanage\.com/);
});

test("new users receive expiring hashed single-use setup tokens without plaintext passwords", () => {
  const source = read("src","app","api","_lib","demoProvisioning.js");
  assert.match(source, /crypto\.randomBytes\(32\)/);
  assert.match(source, /hashAccountToken\(rawToken\)/);
  assert.match(source, /INTERVAL '24 hours'/);
  assert.match(source, /setupPassword: true/);
  assert.doesNotMatch(source, /password:\s*["'`][^"'`]+/);
  const activation = read("src","app","api","auth","activate-account","route.js");
  assert.match(activation, /used_at IS NULL AND expires_at>NOW\(\) FOR UPDATE/);
  assert.match(activation, /validatePassword/);
  assert.match(activation, /bcrypt\.hash/);
});

test("admin API enforces platform permissions and supports retry lifecycle actions", () => {
  const source = read("src","app","api","internal","demo-requests","route.js");
  for (const permission of ["demo_requests.read","demo_requests.manage","demo_workspaces.create","demo_access.send"]) assert.match(source, new RegExp(permission.replace(".","\\.")));
  for (const action of ["provision","resend","extend","revoke","converted","reset","delete"]) assert.match(source, new RegExp(`action === "${action}"`));
  assert.match(read("src","app","api","_lib","demoProvisioning.js"), /access_email_status='failed'/);
});

test("authorized platform staff can discover Demo Requests navigation without exposing it to workspace admins", () => {
  const access = read("src","app","api","internal","platform-access","route.js");
  const sidebar = read("src","app","Sidebar.tsx");
  assert.match(access, /platform_staff_roles/);
  assert.match(access, /hasPlatformPermission\(actor, "demo_requests\.read"\)/);
  assert.match(sidebar, /platformAccess\?\.canReadDemoRequests/);
  assert.match(sidebar, /label="Demo Requests"/);
  const grant = read("scripts","grant-platform-role.mjs");
  assert.match(grant, /verifyDemoDatabaseTarget\(\)/);
  assert.match(grant, /PLATFORM_STAFF_EMAIL/);
  assert.match(grant, /platform_admin.*demo_manager.*demo_sales/);
  assert.doesNotMatch(grant, /a\.gjendzz@gmail\.com/);
});

test("request form keeps entered values readable", () => {
  const source = read("src","app","DemoRequestForm.tsx");
  assert.match(source, /WebkitTextFillColor: "#11162F"/);
  assert.match(source, /input:-webkit-autofill/);
  assert.match(source, /MuiInputLabel-root\.Mui-focused/);
});
