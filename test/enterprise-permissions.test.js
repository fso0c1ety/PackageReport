import test from "node:test";
import assert from "node:assert/strict";
import { ENTERPRISE_ROLES, PERMISSION_ACTIONS, PERMISSION_SCOPES, normalizeEnterpriseRole } from "../src/app/api/_lib/permissions.js";

test("enterprise permission model covers all required roles, actions and scopes", () => {
  assert.deepEqual(Object.keys(ENTERPRISE_ROLES), ["owner", "admin", "manager", "employee", "guest", "client", "custom"]);
  for (const role of Object.values(ENTERPRISE_ROLES)) assert.deepEqual(Object.keys(role.capabilities), PERMISSION_ACTIONS);
  assert.deepEqual(PERMISSION_SCOPES, ["workspace", "module", "board", "view", "group", "row", "column", "file", "automation", "dashboard"]);
});

test("custom roles accept only known boolean capabilities and always retain view access", () => {
  const role = normalizeEnterpriseRole("custom", { edit: true, export: false, injected: true, delete: "yes", view: false });
  assert.equal(role.permission, "read");
  assert.equal(role.capabilities.edit, true);
  assert.equal(role.capabilities.export, false);
  assert.equal(role.capabilities.delete, false);
  assert.equal(role.capabilities.view, true);
  assert.equal("injected" in role.capabilities, false);
});

test("unknown roles are rejected", () => {
  assert.equal(normalizeEnterpriseRole("superuser", { managePermissions: true }), null);
});
