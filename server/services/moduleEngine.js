export const WORKSPACE_MODULES = Object.freeze([
  "crm", "finance", "calendar", "inventory", "hr", "fleet", "logistics",
  "ai", "reports", "documents", "tasks", "customers", "maintenance", "settings",
]);

const MODULE_SET = new Set(WORKSPACE_MODULES);

export function normalizeWorkspaceModules(modules) {
  if (!Array.isArray(modules)) return [];
  return [...new Set(modules.map((module) => String(module).toLowerCase()).filter((module) => MODULE_SET.has(module)))];
}

export function inferWorkspaceModules(boardNames = []) {
  const names = boardNames.map((name) => String(name).toLowerCase());
  const modules = new Set(["calendar", "ai", "settings", "tasks"]);
  const has = (pattern) => names.some((name) => pattern.test(name));
  if (has(/client|customer|contact|compan|deal|lead|sales/)) modules.add("crm");
  if (has(/customer|client/)) modules.add("customers");
  if (has(/invoice|expense|payment|fuel|revenue|finance|account/)) modules.add("finance");
  if (has(/product|stock|inventory|material|warehouse/)) modules.add("inventory");
  if (has(/employee|leave|staff|driver|human resource/)) modules.add("hr");
  if (has(/truck|driver|trip|vehicle|fleet|fuel/)) modules.add("fleet");
  if (has(/load|carrier|freight|dispatch|truck|trip|fleet/)) modules.add("logistics");
  if (has(/report|analytics|kpi/)) modules.add("reports");
  if (has(/document|file|pod|contract/)) modules.add("documents");
  if (has(/maintenance|service|repair|oil|tire|insurance/)) modules.add("maintenance");
  return normalizeWorkspaceModules([...modules]);
}

export function moduleStorageShape(columnNames = []) {
  const columns = new Set(columnNames);
  if (columns.has("module_key")) return "rows";
  if (columns.has("modules")) return "json";
  return "unknown";
}

export function isBoardVisibleForModules(boardName, enabledModules) {
  const name = String(boardName || "").toLowerCase();
  const enabled = new Set(normalizeWorkspaceModules(enabledModules));
  const rules = [
    ["fleet", /truck|driver|trip|vehicle|fleet|fuel/],
    ["maintenance", /maintenance|service|repair|oil|tire|insurance|registration|tachograph/],
    ["logistics", /load|carrier|freight|dispatch/],
    ["inventory", /product|stock|inventory|material|warehouse/],
    ["hr", /employee|leave|staff|human resource/],
    ["crm", /lead|deal|pipeline|contact|compan/],
    ["customers", /customer|client/],
    ["finance", /invoice|expense|payment|revenue|finance|account/],
    ["documents", /document|file|pod|contract/],
    ["tasks", /task|work item|todo/],
  ];
  const required = rules.filter(([, pattern]) => pattern.test(name)).map(([module]) => module);
  return required.length === 0 || required.some((module) => enabled.has(module));
}
