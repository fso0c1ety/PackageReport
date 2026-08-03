const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const templates = readFileSync(join(root, "src", "workspaceTemplates.ts"), "utf8");
const roles = readFileSync(join(root, "src", "app", "api", "_lib", "universalRoles.js"), "utf8");
const portalApi = readFileSync(join(root, "src", "app", "api", "portal-context", "route.js"), "utf8");

test("Phase 3C provisions configuration-driven industry portals", () => {
  for (const role of ["driver", "dispatcher", "fleet_manager", "doctor", "teacher", "parent", "sales_representative", "project_manager", "field_worker", "store_employee", "warehouse_worker", "machine_operator", "employee"]) {
    assert.match(templates, new RegExp(`${role}: \\{ portalType:`));
  }
  assert.match(templates, /roles: jobRolesFor\(template, category\)\.map/);
});

test("portal assignments retain primary role and permitted portal metadata", () => {
  assert.match(roles, /primaryJobRole/);
  assert.match(roles, /permittedPortals/);
  assert.match(portalApi, /permitted_portals \? \$3/);
  assert.match(portalApi, /Portal is not assigned/);
});

test("sensitive profession scopes use server-side assignment fields", () => {
  for (const field of ["assignedDriverUserId", "assignedDoctorUserId", "classTeacherUserId", "linkedParentUserId", "clientCompanyId", "employeeUserId"]) {
    assert.match(templates, new RegExp(field));
  }
});
