export const PERMISSION_ACTIONS = [
  "view", "create", "edit", "delete", "archive", "export", "share",
  "manageMembers", "managePermissions", "manageAutomations", "manageTemplates",
  "editRows", "comment", "uploadFiles", "manageColumns",
];

export const PERMISSION_SCOPES = [
  "workspace", "module", "board", "view", "group", "row", "column",
  "file", "automation", "dashboard",
];

const allow = (...actions) => Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, actions.includes(action)]));

export const ENTERPRISE_ROLES = {
  owner: { permission: "admin", capabilities: allow(...PERMISSION_ACTIONS) },
  admin: { permission: "admin", capabilities: allow(...PERMISSION_ACTIONS.filter((action) => action !== "managePermissions")) },
  manager: { permission: "edit", capabilities: allow("view", "create", "edit", "delete", "archive", "export", "share", "editRows", "comment", "uploadFiles", "manageColumns", "manageAutomations") },
  employee: { permission: "edit", capabilities: allow("view", "create", "edit", "editRows", "comment", "uploadFiles") },
  guest: { permission: "read", capabilities: allow("view", "comment") },
  client: { permission: "read", capabilities: allow("view", "comment", "uploadFiles") },
  custom: { permission: "read", capabilities: allow("view") },
  logistics_admin: { permission: "admin", capabilities: allow(...PERMISSION_ACTIONS) },
  dispatcher: { permission: "edit", capabilities: allow("view", "create", "edit", "editRows", "comment", "uploadFiles", "export") },
  fleet_manager: { permission: "edit", capabilities: allow("view", "create", "edit", "delete", "archive", "export", "editRows", "comment", "uploadFiles", "manageColumns") },
  driver: { permission: "read", capabilities: allow("view", "comment", "uploadFiles") },
  viewer: { permission: "read", capabilities: allow("view") },
};

export function normalizeEnterpriseRole(role, requestedCapabilities = {}) {
  const definition = ENTERPRISE_ROLES[role];
  if (!definition) return null;
  const capabilities = { ...definition.capabilities };
  if (role === "custom") {
    for (const action of PERMISSION_ACTIONS) {
      if (typeof requestedCapabilities[action] === "boolean") capabilities[action] = requestedCapabilities[action];
    }
    capabilities.view = true;
  }
  return { permission: definition.permission, capabilities };
}

