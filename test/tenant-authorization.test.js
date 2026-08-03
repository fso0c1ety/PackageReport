const test = require("node:test");
const assert = require("node:assert/strict");
const { getFileAccess, getRowAccess, getTableAccess, getWorkspaceAccess, roleAllows } = require("../server/services/permissions");
const { createSocketEventGuard, isSafeIdentifier, isSafeSocketPayload, usersMayCommunicate } = require("../server/socket/security");

test("role hierarchy never upgrades viewers into editors", () => {
  assert.equal(roleAllows("viewer", "editor", { viewer: 10, editor: 20 }), false);
  assert.equal(roleAllows("admin", "editor", { viewer: 10, editor: 20, admin: 30 }), true);
});

test("workspace and board access reject a foreign tenant", async () => {
  const db = { query: async (sql) => ({ rows: sql.includes("FROM workspaces w")
    ? [{ id: "workspace-b", owner_id: "owner-b", access_role: null }]
    : [{ id: "table-b", workspace_owner_id: "owner-b", shared_users: [] }] }) };
  assert.equal(await getWorkspaceAccess(db, "workspace-b", "user-a"), null);
  assert.equal(await getTableAccess(db, "table-b", "user-a"), null);
});

test("row permission derives tenant access from its real table", async () => {
  const db = { query: async (sql) => {
    if (sql.startsWith("SELECT * FROM rows")) return { rows: [{ id: "row-b", table_id: "table-b" }] };
    return { rows: [{ id: "table-b", workspace_owner_id: "owner-b", shared_users: [] }] };
  }};
  assert.equal(await getRowAccess(db, "row-b", "user-a", "viewer", "table-b"), null);
  assert.equal(await getRowAccess(db, "row-b", "user-a", "viewer", "table-a"), null);
});

test("workspace membership never implies board access without an explicit board grant", async () => {
  const db = { query: async () => ({ rows: [{ id: "table-a", workspace_owner_id: "owner", workspace_role: "viewer", shared_users: [] }] }) };
  assert.equal(await getTableAccess(db, "table-a", "member", "viewer"), null);
  assert.equal(await getTableAccess(db, "table-a", "member", "editor"), null);
});

test("file access is owner or tenant scoped and cannot be guessed", async () => {
  const ownerDb = { query: async () => ({ rows: [{ id: "file-a", uploaded_by: "user-a" }] }) };
  assert.ok(await getFileAccess(ownerDb, "file-a", "user-a"));
  assert.equal(await getFileAccess(ownerDb, "file-a", "user-b"), null);
});

test("socket payloads and identifiers are bounded", () => {
  assert.equal(isSafeIdentifier("table:abc-123"), true);
  assert.equal(isSafeIdentifier("../secret"), false);
  assert.equal(isSafeSocketPayload({ text: "ok" }), true);
  assert.equal(isSafeSocketPayload({ text: "x".repeat(70 * 1024) }), false);
  const guard = createSocketEventGuard();
  assert.equal(guard("socket-1", "typing", { ok: true }), true);
  assert.equal(guard("socket-1", "typing", { data: "x".repeat(70 * 1024) }), false);
});

test("call signaling requires friendship or a shared workspace", async () => {
  const denied = { query: async () => ({ rowCount: 0, rows: [] }) };
  const allowed = { query: async () => ({ rowCount: 1, rows: [{ '?column?': 1 }] }) };
  assert.equal(await usersMayCommunicate(denied, "user-a", "user-b"), false);
  assert.equal(await usersMayCommunicate(allowed, "user-a", "user-b"), true);
  assert.equal(await usersMayCommunicate(allowed, "user-a", "user-a"), false);
});

test("authorization implementation covers every tenant resource boundary", () => {
  const fs = require("node:fs");
  const middleware = fs.readFileSync(require.resolve("../server/middleware/authorization"), "utf8");
  for (const method of ["requireWorkspacePermission", "requireTablePermission", "requireRowPermission", "requireFilePermission"]) {
    assert.match(middleware, new RegExp(`function ${method}\\(`));
  }
  const filesRoute = fs.readFileSync(require.resolve("../server/routes/compatibilityFiles"), "utf8");
  assert.doesNotMatch(filesRoute, /express\.static/);
  assert.match(filesRoute, /authenticateToken, requireFilePermission\("viewer"\)/);
  const hostedFilesRoute = fs.readFileSync(require.resolve("../src/app/uploads/[filename]/route"), "utf8");
  assert.match(hostedFilesRoute, /getAuthenticatedUser\(req\)/);
  assert.match(hostedFilesRoute, /requireFilePermission\(pool, user\.id/);
  const uploadRoute = fs.readFileSync(require.resolve("../src/app/api/upload/route"), "utf8");
  assert.match(uploadRoute, /SUPABASE_PRIVATE_STORAGE_BUCKET/);
  assert.doesNotMatch(uploadRoute, /getPublicUrl\(/);
  const serverAuth = fs.readFileSync(require.resolve("../src/app/api/_lib/server"), "utf8");
  assert.match(serverAuth, /smart_manage_access/);
});
