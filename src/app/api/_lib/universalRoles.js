export const WORKSPACE_ROLES = ["owner", "admin", "manager", "member", "guest"];
export const BOARD_ROLES = ["owner", "editor", "commenter", "viewer"];
export const PORTAL_TYPES = [
  "standard", "driver", "dispatcher", "client", "doctor", "dental_assistant",
  "receptionist", "teacher", "parent", "sales", "project", "field_worker",
  "store_employee", "warehouse", "production", "hr_employee", "depot", "custom",
];
export const RECORD_ACCESS_SCOPES = [
  "assigned_to_me", "created_by_me", "my_team", "my_department", "my_company",
  "selected_records", "selected_customers", "all_permitted", "custom",
];

export const PORTAL_ROUTES = {
  standard: "/dashboard",
  driver: "/driver-trips",
  dispatcher: "/portal/dispatcher",
  client: "/portal/client",
  doctor: "/portal/doctor",
  dental_assistant: "/portal/dental-assistant",
  receptionist: "/portal/receptionist",
  teacher: "/portal/teacher",
  parent: "/portal/parent",
  sales: "/portal/sales",
  project: "/portal/project",
  field_worker: "/portal/field-worker",
  store_employee: "/portal/store",
  warehouse: "/portal/warehouse",
  production: "/portal/production",
  hr_employee: "/portal/employee",
  depot: "/portal/depot",
  custom: "/portal/custom",
};

export const JOB_ROLE_DEFAULTS = {
  driver: { workspaceRole: "member", portalType: "driver", recordAccess: { scope: "assigned_to_me", field: "assignedDriverUserId" } },
  doctor: { workspaceRole: "member", portalType: "doctor", recordAccess: { scope: "assigned_to_me", field: "assignedDoctorUserId" } },
  teacher: { workspaceRole: "member", portalType: "teacher", recordAccess: { scope: "assigned_to_me", field: "classTeacherUserId" } },
  client: { workspaceRole: "guest", portalType: "client", recordAccess: { scope: "my_company", field: "clientCompanyId" } },
  dispatcher: { workspaceRole: "manager", portalType: "dispatcher", recordAccess: { scope: "all_permitted" } },
  employee: { workspaceRole: "member", portalType: "standard", recordAccess: { scope: "all_permitted" } },
};

const LEGACY_WORKSPACE_ROLE = {
  logistics_admin: "admin", admin: "admin", manager: "manager", guest: "guest",
  viewer: "guest", client: "guest", driver: "member", employee: "member",
};

export function normalizeWorkspaceRole(value, fallback = "member") {
  const role = String(value || "").toLowerCase();
  if (WORKSPACE_ROLES.includes(role)) return role;
  return LEGACY_WORKSPACE_ROLE[role] || fallback;
}

export function normalizeBoardRole(value, fallback = "viewer") {
  const role = String(value || "").toLowerCase();
  if (BOARD_ROLES.includes(role)) return role;
  if (["admin", "manager"].includes(role)) return "owner";
  if (["edit", "employee"].includes(role)) return "editor";
  if (["comment", "client"].includes(role)) return "commenter";
  if (["read", "guest", "driver"].includes(role)) return "viewer";
  return fallback;
}

export function normalizePortalType(value) {
  const portal = String(value || "standard").toLowerCase().replace(/[ -]+/g, "_");
  return PORTAL_TYPES.includes(portal) ? portal : "standard";
}

export function normalizeJobRoles(value) {
  const roles = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(roles.map((role) => String(role).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")).filter(Boolean))].slice(0, 20);
}

export function normalizeRecordAccess(value = {}) {
  const scope = RECORD_ACCESS_SCOPES.includes(value?.scope) ? value.scope : "all_permitted";
  return {
    scope,
    ...(typeof value?.field === "string" && value.field ? { field: value.field.slice(0, 100) } : {}),
    ...(Array.isArray(value?.ids) ? { ids: value.ids.map(String).slice(0, 500) } : {}),
    ...(value?.rule && typeof value.rule === "object" ? { rule: value.rule } : {}),
  };
}

export function membershipFromRow(row) {
  const legacyRole = String(row?.role || "").toLowerCase();
  const workspaceRole = row?.is_owner ? "owner" : normalizeWorkspaceRole(row?.workspace_role || legacyRole);
  const jobRoles = normalizeJobRoles(row?.job_roles?.length ? row.job_roles : [legacyRole].filter((role) => ["driver", "dispatcher", "fleet_manager", "client", "employee"].includes(role)));
  const portalType = normalizePortalType(row?.portal_type || (legacyRole === "driver" ? "driver" : "standard"));
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    templateKey: row.template_key || null,
    workspaceRole,
    jobRoles,
    portalType,
    landingRoute: row?.landing_route || PORTAL_ROUTES[portalType],
    recordAccess: normalizeRecordAccess(row?.record_access),
    navigation: Array.isArray(row?.navigation) ? row.navigation : [],
    allowedActions: Array.isArray(row?.allowed_actions) ? row.allowed_actions : [],
    teamId: row?.team_id || null,
    departmentId: row?.department_id || null,
    companyId: row?.company_id || null,
  };
}

export async function listUserMemberships(pool, userId) {
  const result = await pool.query(`
    SELECT w.id AS workspace_id, w.name AS workspace_name, w.template_key,
           (w.owner_id::text=$1::text) AS is_owner,
           wm.role, wm.workspace_role, wm.job_roles, wm.portal_type,
           wm.landing_route, wm.record_access, wm.navigation, wm.allowed_actions,
           wm.team_id, wm.department_id, wm.company_id
    FROM workspaces w
    LEFT JOIN workspace_members wm
      ON wm.workspace_id=w.id AND wm.user_id::text=$1::text
    WHERE w.owner_id::text=$1::text OR wm.user_id IS NOT NULL
    ORDER BY (w.owner_id::text=$1::text) DESC, w.updated_at DESC NULLS LAST, w.created_at DESC
  `, [String(userId)]);
  return result.rows.map(membershipFromRow);
}

export function legacyPermissionForBoardRole(boardRole) {
  return boardRole === "owner" ? "admin" : boardRole === "editor" ? "edit" : "read";
}
