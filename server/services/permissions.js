const EDITOR_PERMISSIONS = new Set(["owner", "admin", "edit", "editor", "member"]);
const VIEWER_PERMISSIONS = new Set([...EDITOR_PERMISSIONS, "read", "viewer", "guest"]);

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

async function getTableAccess(db, tableId, userId, required = "viewer") {
  const result = await db.query(
    `
      SELECT
        t.*,
        w.owner_id AS workspace_owner_id
      FROM tables t
      LEFT JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1
    `,
    [tableId]
  );

  const table = result.rows[0];
  if (!userHasTablePermission(table, userId, required)) {
    return null;
  }
  return table;
}

module.exports = {
  getTableAccess,
  normalizePermission,
  parseSharedUsers,
  userHasTablePermission,
};
