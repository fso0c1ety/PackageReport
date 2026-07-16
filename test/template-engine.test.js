import test from "node:test";
import assert from "node:assert/strict";
import { createTemplatePlan, normalizeTemplateManifest } from "../server/services/templateEngine.js";

const template = {
  id: "crm",
  name: "CRM",
  category: "Sales",
  boards: [{ name: "Deals", columns: [{ name: "Status", type: "Status" }, { name: "Close", type: "Date" }], rows: [{ Name: "Sample" }] }],
};

test("template manifests include modules, views, dashboards and roles", () => {
  const manifest = normalizeTemplateManifest(template);
  assert.ok(manifest.modules.includes("crm"));
  assert.deepEqual(manifest.views.map((view) => view.type), ["table", "kanban", "calendar"]);
  assert.equal(manifest.dashboards.length, 1);
  assert.ok(manifest.roles.some((role) => role.key === "owner"));
});

test("template plans use stable relations and optional sample data", () => {
  let sequence = 0;
  const plan = createTemplatePlan(template, { workspaceId: "workspace", ownerId: "user", idFactory: () => `id-${++sequence}`, includeSampleData: false });
  assert.equal(plan.boards[0].id, "id-1");
  assert.ok(plan.views.every((view) => view.tableId === "id-1"));
  assert.deepEqual(plan.boards[0].rows, []);

  const samplePlan = createTemplatePlan(template, { idFactory: () => `sample-${++sequence}`, includeSampleData: true });
  assert.equal(samplePlan.boards[0].rows.length, 1);
});

test("template plans preserve custom views, dashboards and automations", () => {
  const plan = createTemplatePlan({
    ...template,
    views: [{ boardName: "Deals", name: "Pipeline", type: "kanban", config: { groupBy: "Status" } }],
    dashboards: [{ name: "CRM Overview", widgets: [{ type: "kpi", title: "Open deals" }] }],
    automations: [{ trigger: "date_arrives", board: "Deals", action: "notify_manager" }],
  }, { idFactory: (() => { let sequence = 0; return () => `custom-${++sequence}`; })() });
  assert.equal(plan.views[0].config.groupBy, "Status");
  assert.equal(plan.dashboards[0].widgets[0].title, "Open deals");
  assert.equal(plan.automations[0].action, "notify_manager");
});
