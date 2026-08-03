const WORKSPACE_RANK = Object.freeze({ guest: 10, viewer: 10, member: 20, editor: 20, admin: 30, owner: 40 });
const BOARD_RANK = Object.freeze({ guest: 10, viewer: 10, commenter: 15, member: 20, editor: 20, admin: 30, owner: 40 });

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

export async function requireWorkspacePermission(pool, userId, workspaceId, required = "viewer") {
  if (!userId || !workspaceId) return null;
  const result = await pool.query(`
    SELECT w.*,
      CASE WHEN w.owner_id::text=$2::text THEN 'owner'
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
  const result = await pool.query(`
    SELECT t.*,w.owner_id AS workspace_owner_id,
      CASE WHEN w.owner_id::text=$2::text THEN 'owner'
        ELSE COALESCE((SELECT LOWER(COALESCE(member->>'permission',member->>'role','editor'))
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) member
          WHERE COALESCE(member->>'userId',member#>>'{}')=$2::text LIMIT 1), wm.role) END AS access_role
    FROM tables t JOIN workspaces w ON w.id=t.workspace_id
    LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
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
  return board ? { row, board } : null;
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

export const authorizationInternals = { allows, normalizeRole, BOARD_RANK, WORKSPACE_RANK };
