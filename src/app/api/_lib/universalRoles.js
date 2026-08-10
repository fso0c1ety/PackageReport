export const WORKSPACE_ROLES = ["owner", "admin", "manager", "member", "guest"];
export const BOARD_ROLES = ["owner", "editor", "commenter", "viewer"];
export const PORTAL_TYPES = [
  "standard", "driver", "dispatcher", "client", "doctor", "dental_assistant",
  "receptionist", "teacher", "parent", "sales", "project", "field_worker",
  "store_employee", "warehouse", "production", "hr_employee", "depot", "fleet_manager",
  "site_manager", "patient", "mechanic", "quality", "inventory", "custom",
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
  fleet_manager: "/portal/fleet-manager",
  site_manager: "/portal/site-manager",
  patient: "/portal/patient",
  mechanic: "/portal/mechanic",
  quality: "/portal/quality",
  inventory: "/portal/inventory",
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
  const legacyPortalType = normalizePortalType(legacyRole);
  const inferredPortalType = legacyPortalType !== "standard" || legacyRole === "standard" ? legacyPortalType : "standard";
  const jobRoles = normalizeJobRoles(row?.job_roles?.length
    ? row.job_roles
    : [legacyRole].filter((role) => inferredPortalType !== "standard" || ["employee"].includes(role)));
  const portalType = normalizePortalType(row?.portal_type || inferredPortalType);
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    templateKey: row.template_key || null,
    workspaceRole,
    jobRoles,
    primaryJobRole: row?.primary_job_role || jobRoles[0] || null,
    portalType,
    permittedPortals: Array.isArray(row?.permitted_portals) && row.permitted_portals.length ? row.permitted_portals : [portalType],
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
  const schema = await pool.query(`SELECT
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='workspace_role') AS has_workspace_role,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='portal_type') AS has_portal_type`);
  if (!schema.rows[0]?.has_workspace_role || !schema.rows[0]?.has_portal_type) {
    const legacy = await pool.query(`
      SELECT w.id AS workspace_id,w.name AS workspace_name,w.template_key,
        (w.owner_id::text=$1::text) AS is_owner,
        COALESCE((
          SELECT LOWER(COALESCE(member->>'portalType',member->>'jobRole',member->>'boardRole',member->>'role',member->>'permission',''))
          FROM tables t,LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END
          ) member
          WHERE t.workspace_id=w.id AND COALESCE(member->>'userId',member#>>'{}')=$1::text
          ORDER BY CASE WHEN LOWER(COALESCE(member->>'portalType',member->>'jobRole',member->>'boardRole',member->>'role',''))='driver' THEN 0 ELSE 1 END
          LIMIT 1
        ),wm.role) AS role,
        NULL::text AS workspace_role,NULL::jsonb AS job_roles,NULL::text AS primary_job_role,
        NULL::text AS portal_type,NULL::jsonb AS permitted_portals,NULL::text AS landing_route,
        NULL::jsonb AS record_access,NULL::jsonb AS navigation,NULL::jsonb AS allowed_actions,
        NULL::text AS team_id,NULL::text AS department_id,NULL::text AS company_id
      FROM workspaces w
      LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$1::text
      WHERE w.owner_id::text=$1::text OR wm.user_id IS NOT NULL OR EXISTS(
        SELECT 1 FROM tables t,LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END
        ) member WHERE t.workspace_id=w.id AND COALESCE(member->>'userId',member#>>'{}')=$1::text)
      ORDER BY (w.owner_id::text=$1::text) DESC,w.updated_at DESC NULLS LAST,w.created_at DESC
    `,[String(userId)]);
    return legacy.rows.map(membershipFromRow);
  }
  const result = await pool.query(`
    SELECT w.id AS workspace_id, w.name AS workspace_name, w.template_key,
           (w.owner_id::text=$1::text) AS is_owner,
           wm.role, wm.workspace_role, wm.job_roles, wm.primary_job_role, wm.portal_type, wm.permitted_portals,
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
