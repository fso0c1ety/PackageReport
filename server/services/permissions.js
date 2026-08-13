const EDITOR_PERMISSIONS = new Set(["owner", "admin", "edit", "editor", "member"]);
const VIEWER_PERMISSIONS = new Set([...EDITOR_PERMISSIONS, "read", "viewer", "guest"]);
const WORKSPACE_ROLE_RANK = Object.freeze({ guest: 10, viewer: 10, member: 20, editor: 20, admin: 30, owner: 40 });
const TABLE_ROLE_RANK = Object.freeze({ guest: 10, read: 10, viewer: 10, commenter: 15, member: 20, edit: 20, editor: 20, admin: 30, owner: 40 });

function normalizePermission(value) {
  if (!value) return "viewer";
  if (value === "member") return "editor";
  if (value === "edit") return "editor";
  if (value === "read") return "viewer";
  return String(value).toLowerCase();
}

function parseSharedUsers(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function userHasTablePermission(table, userId, required = "viewer") {
  if (!table || !userId) return false;
  if (table.owner_id === userId || table.workspace_owner_id === userId) return true;

  const sharedUsers = parseSharedUsers(table.shared_users);
  const match = sharedUsers.find((entry) => {
    if (typeof entry === "string") return entry === userId;
    return entry?.userId === userId || entry?.id === userId;
  });

  if (!match) return false;
  const permission = normalizePermission(typeof match === "string" ? "editor" : match.permission);
  const allowed = required === "viewer" ? VIEWER_PERMISSIONS : EDITOR_PERMISSIONS;
  return allowed.has(permission);
}

function roleAllows(actual, required, hierarchy) {
  if (!actual) return false;
  return (hierarchy[normalizePermission(actual)] || 0) >= (hierarchy[normalizePermission(required)] || 0);
}

function tableRole(table, userId) {
  if (!table || !userId) return null;
  if (String(table.owner_id || table.workspace_owner_id) === String(userId)) return "owner";
  if (table.normalized_board_role) return normalizePermission(table.normalized_board_role);
  const match = parseSharedUsers(table.shared_users).find((entry) =>
    String(typeof entry === "string" ? entry : entry?.userId || entry?.id || "") === String(userId));
  if (match) return normalizePermission(typeof match === "string" ? "editor" : match.boardRole || match.permission || match.role);
  const workspaceRole = String(table.workspace_access_role || table.workspace_role || "").toLowerCase();
  return ["owner", "admin", "logistics_admin"].includes(workspaceRole) ? "owner" : null;
}

function valueContainsUser(value, userId) {
  if (String(value ?? "") === String(userId)) return true;
  if (Array.isArray(value)) return value.some((entry) => valueContainsUser(entry?.id ?? entry?.userId ?? entry, userId));
  if (value && typeof value === "object") return valueContainsUser(value.id ?? value.userId ?? value.value, userId);
  return false;
}

function columnValue(row, table, field) {
  const values = row?.values && typeof row.values === "object" ? row.values : {};
  if (Object.prototype.hasOwnProperty.call(values, field)) return values[field];
  const normalized = String(field || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const column = columns.find((item) => String(item?.id) === String(field)
    || String(item?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "") === normalized);
  return column ? values[column.id] : undefined;
}

function rowMatchesRecordAccess(row, table, userId) {
  if (!table || String(table.workspace_owner_id || table.owner_id) === String(userId)) return true;
  const workspaceRole = String(table.workspace_access_role || table.workspace_role || "").toLowerCase();
  if (["owner", "admin", "logistics_admin"].includes(workspaceRole)) return true;
  const access = table.board_record_access || table.record_access || { scope: "all_permitted" };
  const scope = access?.scope || "all_permitted";
  if (scope === "all_permitted") return true;
  if (scope === "created_by_me") return String(row?.created_by || "") === String(userId);
  if (scope === "selected_records") return Array.isArray(access.ids) && access.ids.map(String).includes(String(row?.id));
  const fieldDefaults = {
    assigned_to_me: "assignedUserId", my_team: "teamId", my_department: "departmentId",
    my_company: "companyId", selected_customers: "customerId",
  };
  const expected = scope === "assigned_to_me" ? userId
    : scope === "my_team" ? table.member_team_id
    : scope === "my_department" ? table.member_department_id
    : scope === "my_company" ? table.member_company_id
    : scope === "selected_customers" ? access.ids
    : scope === "custom" && access.rule?.value === "$current_user" ? userId
    : access.rule?.value;
  const actual = columnValue(row, table, access.field || access.rule?.field || fieldDefaults[scope]);
  return Array.isArray(expected)
    ? expected.some((value) => valueContainsUser(actual, value))
    : expected != null && valueContainsUser(actual, expected);
}

async function getWorkspaceAccess(db, workspaceId, userId, required = "viewer") {
  if (!workspaceId || !userId) return null;
  const result = await db.query(`
    SELECT w.*,
      CASE
        WHEN w.owner_id::text=$2::text THEN 'owner'
        WHEN wm.workspace_role IS NOT NULL THEN LOWER(wm.workspace_role)
        WHEN wm.role IS NOT NULL THEN LOWER(wm.role)
        WHEN EXISTS (
          SELECT 1 FROM tables t,
          LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) m
          WHERE t.workspace_id=w.id AND COALESCE(m->>'userId',m#>>'{}')=$2::text
        ) THEN 'member'
        ELSE NULL
      END AS access_role
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
    WHERE w.id=$1
    LIMIT 1`, [workspaceId, String(userId)]);
  const workspace = result.rows[0];
  return workspace && roleAllows(workspace.access_role, required, WORKSPACE_ROLE_RANK) ? workspace : null;
}

async function getTableAccess(db, tableId, userId, required = "viewer") {
  const result = await db.query(
    `
      SELECT
        t.*,
        w.owner_id AS workspace_owner_id,
        COALESCE(wm.workspace_role,wm.role) AS workspace_access_role,
        wm.record_access,
        wm.team_id AS member_team_id,
        wm.department_id AS member_department_id,
        wm.company_id AS member_company_id,
        bma.board_role AS normalized_board_role,
        bma.record_access AS board_record_access
      FROM tables t
      LEFT JOIN workspaces w ON t.workspace_id = w.id
      LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
      LEFT JOIN board_member_access bma ON bma.table_id=t.id AND bma.user_id::text=$2::text
      WHERE t.id = $1
    `,
    [tableId, String(userId)]
  );

  const table = result.rows[0];
  const actualRole = tableRole(table, userId);
  if (!roleAllows(actualRole, required, TABLE_ROLE_RANK)) {
    return null;
  }
  table.access_role = actualRole;
  return table;
}

async function getRowAccess(db, rowId, userId, required = "viewer", expectedTableId = null) {
  if (!rowId || !userId) return null;
  const result = await db.query("SELECT * FROM rows WHERE id=$1", [rowId]);
  const row = result.rows[0];
  if (!row || (expectedTableId && String(row.table_id) !== String(expectedTableId))) return null;
  const table = await getTableAccess(db, row.table_id, userId, required);
  return table && rowMatchesRecordAccess(row, table, userId) ? { row, table } : null;
}

async function getFileAccess(db, fileIdOrName, userId, required = "viewer") {
  if (!fileIdOrName || !userId) return null;
  const result = await db.query(
    "SELECT * FROM uploaded_files WHERE id::text=$1::text OR filename=$1 LIMIT 1",
    [String(fileIdOrName)],
  );
  const file = result.rows[0];
  if (!file) return null;
  if (String(file.uploaded_by || "") === String(userId)) return { file, role: "owner" };
  if (file.row_id) {
    const access = await getRowAccess(db, file.row_id, userId, required, file.table_id || null);
    return access ? { file, ...access } : null;
  }
  if (file.table_id) {
    const table = await getTableAccess(db, file.table_id, userId, required);
    return table ? { file, table } : null;
  }
  return null;
}

module.exports = {
  getTableAccess,
  getWorkspaceAccess,
  getRowAccess,
  getFileAccess,
  normalizePermission,
  parseSharedUsers,
  rowMatchesRecordAccess,
  roleAllows,
  tableRole,
  userHasTablePermission,
};
