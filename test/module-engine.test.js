import test from "node:test";
import assert from "node:assert/strict";
import { inferWorkspaceModules, isBoardVisibleForModules, moduleStorageShape, normalizeWorkspaceModules, WORKSPACE_MODULES } from "../server/services/moduleEngine.js";

test("module registry contains every Phase 15 module", () => {
  assert.deepEqual(WORKSPACE_MODULES, ["crm", "finance", "calendar", "inventory", "hr", "fleet", "logistics", "ai", "reports", "documents", "tasks", "customers", "maintenance", "settings"]);
});

test("modules are normalized, deduplicated and unknown keys are rejected", () => {
  assert.deepEqual(normalizeWorkspaceModules(["Fleet", "fleet", "invalid", "Tasks"]), ["fleet", "tasks"]);
});

test("legacy and universal storage schemas are detected", () => {
  assert.equal(moduleStorageShape(["workspace_id", "modules"]), "json");
  assert.equal(moduleStorageShape(["workspace_id", "module_key", "enabled"]), "rows");
});

test("modules are inferred without hardcoded logistics defaults", () => {
  const modules = inferWorkspaceModules(["Customers", "Invoices", "Tasks"]);
  assert.ok(modules.includes("customers"));
  assert.ok(modules.includes("finance"));
  assert.ok(modules.includes("tasks"));
  assert.ok(!modules.includes("fleet"));
});

test("disabled fleet and maintenance hide their boards without deleting data", () => {
  assert.equal(isBoardVisibleForModules("Trucks", ["tasks"]), false);
  assert.equal(isBoardVisibleForModules("Maintenance", ["fleet"]), false);
  assert.equal(isBoardVisibleForModules("Maintenance", ["maintenance"]), true);
  assert.equal(isBoardVisibleForModules("General Board", []), true);
});
