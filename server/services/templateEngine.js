import { randomUUID } from "node:crypto";

const CATEGORY_MODULES = Object.freeze({
  Logistics: ["logistics", "calendar", "finance", "documents", "reports"],
  Sales: ["crm", "calendar", "finance", "reports"],
  Projects: ["projects", "calendar", "documents", "reports"],
  Healthcare: ["crm", "calendar", "inventory", "finance", "documents"],
  Education: ["crm", "calendar", "hr", "documents"],
  Retail: ["inventory", "finance", "crm", "reports"],
  Construction: ["projects", "inventory", "finance", "documents", "reports"],
  Manufacturing: ["inventory", "maintenance", "finance", "reports"],
  HR: ["hr", "calendar", "documents"],
  Other: ["calendar", "documents"],
});

export function normalizeTemplateManifest(input) {
  if (!input?.id || !input?.name || !Array.isArray(input?.boards)) {
    throw new Error("Template id, name and boards are required");
  }

  const category = String(input.category || "Other");
  const modules = [...new Set(input.modules || CATEGORY_MODULES[category] || CATEGORY_MODULES.Other)];
  const boards = input.boards.map((board, index) => ({
    name: String(board.name || `Board ${index + 1}`),
    columns: Array.isArray(board.columns) ? board.columns : [],
    rows: Array.isArray(board.rows) ? board.rows : [],
  }));
  const views = input.views?.length ? input.views : boards.flatMap((board) => [
    { boardName: board.name, name: "Table", type: "table", isDefault: true },
    ...(board.columns.some((column) => column.type === "Status") ? [{ boardName: board.name, name: "Kanban", type: "kanban" }] : []),
    ...(board.columns.some((column) => column.type === "Date") ? [{ boardName: board.name, name: "Calendar", type: "calendar" }] : []),
  ]);

  return {
    id: String(input.id),
    name: String(input.name),
    category,
    description: String(input.description || ""),
    icon: String(input.icon || "Template"),
    coverImage: input.coverImage || null,
    modules,
    boards,
    views,
    dashboards: input.dashboards?.length ? input.dashboards : [{ name: `${input.name} Overview`, widgets: [{ type: "kpi", title: "Total rows", aggregation: "count" }] }],
    automations: Array.isArray(input.automations) ? input.automations : [],
    roles: input.roles?.length ? input.roles : [
      { key: "owner", name: "Owner", permissions: ["*"] },
      { key: "admin", name: "Admin", permissions: ["manage_workspace"] },
      { key: "employee", name: "Employee", permissions: ["view", "edit"] },
    ],
    sampleData: Array.isArray(input.sampleData) ? input.sampleData : [],
  };
}

export function createTemplatePlan(manifestInput, { workspaceId = randomUUID(), ownerId, idFactory = randomUUID, includeSampleData = false } = {}) {
  const manifest = normalizeTemplateManifest(manifestInput);
  const boardIds = new Map(manifest.boards.map((board) => [board.name, idFactory()]));
  return {
    workspace: { id: workspaceId, name: manifest.name, ownerId, templateId: manifest.id },
    modules: manifest.modules,
    boards: manifest.boards.map((board) => ({ ...board, id: boardIds.get(board.name), rows: includeSampleData ? board.rows : [] })),
    views: manifest.views.filter((view) => boardIds.has(view.boardName)).map((view) => ({ ...view, id: idFactory(), tableId: boardIds.get(view.boardName) })),
    dashboards: manifest.dashboards.map((dashboard) => ({ ...dashboard, id: idFactory() })),
    automations: manifest.automations,
    roles: manifest.roles,
  };
}
