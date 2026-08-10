const WORKSPACE_RANK = Object.freeze({ guest: 10, viewer: 10, member: 20, editor: 20, admin: 30, owner: 40 });
const BOARD_RANK = Object.freeze({ guest: 10, viewer: 10, commenter: 15, member: 20, editor: 20, admin: 30, owner: 40 });

let universalRoleSchemaCache = { checkedAt: 0, available: false };

async function hasUniversalRoleSchema(pool) {
  const now = Date.now();
  if (now - universalRoleSchemaCache.checkedAt < 60_000) return universalRoleSchemaCache.available;
  const result = await pool.query(`
    SELECT to_regclass('public.board_member_access') IS NOT NULL AS has_board_access,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='workspace_members' AND column_name='workspace_role'
      ) AS has_workspace_role
  `);
  universalRoleSchemaCache = {
    checkedAt: now,
    available: Boolean(result.rows[0]?.has_board_access && result.rows[0]?.has_workspace_role),
  };
  return universalRoleSchemaCache.available;
}

function normalizeRole(value, fallback = "viewer") {
  const role = String(value || fallback).toLowerCase();
  if (role === "read") return "viewer";
  if (role === "edit") return "editor";
  return role;
}

function allows(actual, required, hierarchy) {
  if (!actual) return false;
  return (hierarchy[normalizeRole(actual)] || 0) >= (hierarchy[normalizeRole(required)] || 0);
}

function valueContains(value, expected) {
  if (String(value ?? "") === String(expected)) return true;
  if (Array.isArray(value)) return value.some((entry) => valueContains(entry?.id ?? entry?.userId ?? entry, expected));
  if (value && typeof value === "object") return valueContains(value.id ?? value.userId ?? value.value, expected);
  return false;
}

function scopedValue(row, board, field) {
  const values = row?.values && typeof row.values === "object" ? row.values : {};
  if (Object.prototype.hasOwnProperty.call(values, field)) return values[field];
  const target = String(field || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const column = (Array.isArray(board?.columns) ? board.columns : []).find((item) =>
    String(item?.id) === String(field) || String(item?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "") === target);
  return column ? values[column.id] : undefined;
}

export function rowMatchesRecordAccess(row, board, userId) {
  if (!row || !board) return false;
  if (String(board.workspace_owner_id || "") === String(userId)) return true;
  if (["owner", "admin", "logistics_admin"].includes(String(board.workspace_role || "").toLowerCase())) return true;
  const access = board.board_record_access || board.record_access || { scope: "all_permitted" };
  const scope = access?.scope || "all_permitted";
  if (scope === "all_permitted") return true;
  if (scope === "created_by_me") return String(row.created_by || "") === String(userId);
  if (scope === "selected_records") return Array.isArray(access.ids) && access.ids.map(String).includes(String(row.id));
  const defaults = { assigned_to_me: "assignedUserId", my_team: "teamId", my_department: "departmentId", my_company: "companyId", selected_customers: "customerId" };
  const field = access.field || access.rule?.field || defaults[scope];
  const expected = scope === "assigned_to_me" ? userId
    : scope === "my_team" ? board.member_team_id
    : scope === "my_department" ? board.member_department_id
    : scope === "my_company" ? board.member_company_id
    : scope === "selected_customers" ? access.ids
    : scope === "custom" && access.rule?.value === "$current_user" ? userId : access.rule?.value;
  const actual = scopedValue(row, board, field);
  return Array.isArray(expected) ? expected.some((item) => valueContains(actual, item)) : expected != null && valueContains(actual, expected);
}

export function recordAccessQueryContext(board, userId) {
  const privileged = String(board?.workspace_owner_id || "") === String(userId)
    || ["owner", "admin", "logistics_admin"].includes(String(board?.workspace_role || "").toLowerCase());
  return {
    columns: Array.isArray(board?.columns) ? board.columns : [],
    userId: String(userId),
    access: privileged ? { scope: "all_permitted" } : (board?.board_record_access || board?.record_access || { scope: "all_permitted" }),
    teamId: board?.member_team_id || null,
    departmentId: board?.member_department_id || null,
    companyId: board?.member_company_id || null,
  };
}

export async function requireWorkspacePermission(pool, userId, workspaceId, required = "viewer") {
  if (!userId || !workspaceId) return null;
  const result = await pool.query(`
    SELECT w.*,
      CASE WHEN w.owner_id::text=$2::text THEN 'owner'
        WHEN wm.workspace_role IS NOT NULL THEN LOWER(wm.workspace_role)
        WHEN wm.role IS NOT NULL THEN LOWER(wm.role)
        WHEN EXISTS (
          SELECT 1 FROM tables t, LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END
          ) member WHERE t.workspace_id=w.id AND COALESCE(member->>'userId',member#>>'{}')=$2::text
        ) THEN 'member' ELSE NULL END AS access_role
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
    WHERE w.id=$1 LIMIT 1`, [workspaceId, String(userId)]);
  const workspace = result.rows[0];
  return workspace && allows(workspace.access_role, required, WORKSPACE_RANK) ? workspace : null;
}

export async function requireBoardPermission(pool, userId, tableId, required = "viewer") {
  if (!userId || !tableId) return null;
  if (!(await hasUniversalRoleSchema(pool))) {
    const legacyResult = await pool.query(`
      SELECT t.*,w.owner_id AS workspace_owner_id,NULL::text AS workspace_role,
        NULL::jsonb AS record_access,NULL::text AS member_team_id,NULL::text AS member_department_id,
        NULL::text AS member_company_id,NULL::jsonb AS board_record_access,
        (SELECT LOWER(COALESCE(member->>'boardRole',member->>'role',member->>'permission',''))
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) member
          WHERE COALESCE(member->>'userId',member#>>'{}')=$2::text LIMIT 1) AS legacy_shared_role,
        CASE WHEN w.owner_id::text=$2::text THEN 'owner'
          ELSE (SELECT LOWER(CASE
            WHEN COALESCE(member->>'boardRole',member->>'role','') IN ('owner','admin') THEN COALESCE(member->>'boardRole',member->>'role')
            WHEN COALESCE(member->>'permission','')='admin' THEN 'admin'
            WHEN COALESCE(member->>'permission','')='read' THEN 'viewer'
            WHEN COALESCE(member->>'permission','')='comment' THEN 'commenter'
            ELSE 'editor' END)
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) member
          WHERE COALESCE(member->>'userId',member#>>'{}')=$2::text LIMIT 1) END AS access_role
      FROM tables t JOIN workspaces w ON w.id=t.workspace_id
      WHERE t.id=$1 LIMIT 1`, [tableId, String(userId)]);
    const legacyBoard = legacyResult.rows[0];
    if (legacyBoard) {
      legacyBoard.legacy_authorization = true;
      if (legacyBoard.legacy_shared_role === "driver") {
        legacyBoard.board_record_access = { scope: "assigned_to_me", field: "_assignedDriverUserId" };
      }
    }
    return legacyBoard && allows(legacyBoard.access_role, required, BOARD_RANK) ? legacyBoard : null;
  }
  const result = await pool.query(`
    SELECT t.*,w.owner_id AS workspace_owner_id,
      COALESCE(wm.workspace_role,wm.role) AS workspace_role,
      wm.record_access,wm.team_id AS member_team_id,wm.department_id AS member_department_id,wm.company_id AS member_company_id,
      bma.record_access AS board_record_access,
      CASE WHEN w.owner_id::text=$2::text THEN 'owner'
        WHEN bma.board_role IS NOT NULL THEN LOWER(bma.board_role)
        WHEN COALESCE(wm.workspace_role,wm.role) IN ('owner','admin','logistics_admin') THEN 'owner'
        ELSE (SELECT LOWER(COALESCE(member->>'boardRole',member->>'permission',member->>'role','editor'))
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) member
          WHERE COALESCE(member->>'userId',member#>>'{}')=$2::text LIMIT 1) END AS access_role
    FROM tables t JOIN workspaces w ON w.id=t.workspace_id
    LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
    LEFT JOIN board_member_access bma ON bma.table_id=t.id AND bma.user_id::text=$2::text
    WHERE t.id=$1 LIMIT 1`, [tableId, String(userId)]);
  const board = result.rows[0];
  return board && allows(board.access_role, required, BOARD_RANK) ? board : null;
}

export async function requireRowPermission(pool, userId, rowId, required = "viewer", expectedTableId = null) {
  if (!userId || !rowId) return null;
  const result = await pool.query("SELECT * FROM rows WHERE id=$1", [rowId]);
  const row = result.rows[0];
  if (!row || (expectedTableId && String(row.table_id) !== String(expectedTableId))) return null;
  const board = await requireBoardPermission(pool, userId, row.table_id, required);
  return board && rowMatchesRecordAccess(row, board, userId) ? { row, board } : null;
}

export async function requireFilePermission(pool, userId, fileIdOrName, required = "viewer") {
  if (!userId || !fileIdOrName) return null;
  const result = await pool.query("SELECT * FROM uploaded_files WHERE id::text=$1::text OR filename=$1 LIMIT 1", [String(fileIdOrName)]);
  const file = result.rows[0];
  if (!file) return null;
  if (file.visibility === "profile") return { file, role: "viewer" };
  if (file.row_id) {
    const access = await requireRowPermission(pool, userId, file.row_id, required, file.table_id || null);
    return access ? { file, ...access } : null;
  }
  if (file.table_id) {
    const board = await requireBoardPermission(pool, userId, file.table_id, required);
    return board ? { file, board } : null;
  }
  if (file.workspace_id) {
    const workspace = await requireWorkspacePermission(pool, userId, file.workspace_id, required);
    return workspace ? { file, workspace } : null;
  }
  return String(file.uploaded_by || "") === String(userId) ? { file, role: "owner" } : null;
}

export async function usersMayCommunicate(pool, userId, targetId) {
  if (!userId || !targetId || String(userId) === String(targetId)) return false;
  const result = await pool.query(`SELECT 1 WHERE
    EXISTS (SELECT 1 FROM friends WHERE status='accepted' AND
      ((user_id::text=$1::text AND friend_id::text=$2::text) OR (user_id::text=$2::text AND friend_id::text=$1::text)))
    OR EXISTS (SELECT 1 FROM direct_messages WHERE
      (sender_id::text=$1::text AND recipient_id::text=$2::text) OR (sender_id::text=$2::text AND recipient_id::text=$1::text))
    OR EXISTS (SELECT 1 FROM workspaces w WHERE
      (w.owner_id::text=$1::text OR EXISTS (SELECT 1 FROM workspace_members a WHERE a.workspace_id=w.id AND a.user_id::text=$1::text))
      AND (w.owner_id::text=$2::text OR EXISTS (SELECT 1 FROM workspace_members b WHERE b.workspace_id=w.id AND b.user_id::text=$2::text)))
    LIMIT 1`, [String(userId), String(targetId)]);
  return result.rowCount > 0;
}

export const authorizationInternals = { allows, normalizeRole, BOARD_RANK, WORKSPACE_RANK, hasUniversalRoleSchema };
