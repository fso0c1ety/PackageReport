const express = require("express");
const { v4: uuidv4 } = require("uuid");

function normalizePermission(permission) {
  return permission === "admin" ? "admin" : (permission === "read" ? "read" : "edit");
}

function createTableSharingRouter({ billingService, db, logger, sendPushNotification }) {
  const router = express.Router();

  router.post("/tables/:tableId/share", async (req, res) => {
    const { userId, permission } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const normalizedPermission = normalizePermission(permission);
    try {
      const result = await db.query("SELECT * FROM tables WHERE id = $1", [req.params.tableId]);
      const table = result.rows[0];
      if (!table) return res.status(404).json({ error: "Table not found" });
      const workspaceResult = await db.query("SELECT * FROM workspaces WHERE id = $1", [table.workspace_id]);
      const workspace = workspaceResult.rows[0];
      const callerShare = (table.shared_users || []).find((user) => user.userId === String(req.user.id));
      if (workspace?.owner_id !== req.user.id && callerShare?.permission !== "admin") {
        return res.status(403).json({ error: "Only workspace owners and admins can share tables" });
      }
      const sharedUsers = table.shared_users || [];
      const existingIndex = sharedUsers.findIndex((user) => user.userId === userId);
      if (existingIndex !== -1) {
        sharedUsers[existingIndex].permission = normalizedPermission;
        await db.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [JSON.stringify(sharedUsers), table.id]);
        return res.json({ success: true, shared_users: sharedUsers, message: "Permission updated" });
      }
      const seatCheck = await billingService.assertSeatAvailable(workspace.owner_id, String(userId));
      if (!seatCheck.allowed) {
        return res.status(402).json({ error: "Plan seat limit reached", code: "SEAT_LIMIT_REACHED", billing: seatCheck.status });
      }
      const notificationId = uuidv4();
      await db.query("INSERT INTO notifications (id, recipient_id, sender_id, type, data) VALUES ($1, $2, $3, $4, $5)", [
        notificationId, userId, req.user.id, "invite",
        JSON.stringify({ tableId: table.id, tableName: table.name, permission: normalizedPermission }),
      ]);
      const userResult = await db.query("SELECT fcm_token FROM users WHERE id = $1", [userId]);
      const token = userResult.rows[0]?.fcm_token;
      if (token) {
        await sendPushNotification([token], "Table Invite", `${req.user.name} requests you to share this table: ${table.name}`, {
          type: "invite", notificationId, tableId: table.id,
        });
      }
      return res.json({ success: true, message: "Invite sent to user" });
    } catch (error) {
      logger.error("table_share_failed", { tableId: req.params.tableId, userId: req.user.id, targetUserId: userId, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/tables/:tableId/members", async (req, res) => {
    try {
      const access = await db.query(`SELECT t.id, t.shared_users, w.owner_id FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id WHERE t.id = $1 AND
        (w.owner_id = $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) elem WHERE elem->>'userId' = $2))`,
      [req.params.tableId, req.user.id]);
      if (!access.rows.length) return res.status(403).json({ error: "Access denied" });
      const table = access.rows[0];
      const memberIds = [...new Set([table.owner_id, ...(table.shared_users || []).map((user) => user.userId)])];
      const users = await db.query("SELECT id, name, email, avatar FROM users WHERE id = ANY($1)", [memberIds]);
      const members = users.rows.map((user) => ({
        ...user,
        avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`,
        role: user.id === table.owner_id ? "owner" : "member",
      }));
      members.sort((left, right) => left.role === "owner" ? -1 : (right.role === "owner" ? 1 : left.name.localeCompare(right.name)));
      return res.json(members);
    } catch (error) {
      logger.error("table_members_fetch_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/tables/:tableId/shared-users", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM tables WHERE id = $1", [req.params.tableId]);
      const table = result.rows[0];
      if (!table) return res.status(404).json({ error: "Table not found" });
      const workspaceResult = await db.query("SELECT * FROM workspaces WHERE id = $1", [table.workspace_id]);
      if (workspaceResult.rows[0]?.owner_id !== req.user.id) return res.status(403).json({ error: "Only owners can manage shared users" });
      const sharedUsers = table.shared_users || [];
      if (!sharedUsers.length) return res.json([]);
      const users = await db.query("SELECT id, name, email, avatar FROM users WHERE id = ANY($1)", [sharedUsers.map((user) => user.userId)]);
      return res.json(users.rows.map((user) => ({
        ...user,
        permission: sharedUsers.find((shared) => shared.userId === user.id)?.permission || "read",
      })));
    } catch (error) {
      logger.error("table_shared_users_fetch_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/tables/:tableId/share/:userId", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM tables WHERE id = $1", [req.params.tableId]);
      const table = result.rows[0];
      if (!table) return res.status(404).json({ error: "Table not found" });
      const workspaceResult = await db.query("SELECT * FROM workspaces WHERE id = $1", [table.workspace_id]);
      if (workspaceResult.rows[0]?.owner_id !== req.user.id && req.user.id !== req.params.userId) {
        return res.status(403).json({ error: "Only owners or the user themselves can remove shared access" });
      }
      const sharedUsers = (table.shared_users || []).filter((user) => user.userId !== req.params.userId);
      await db.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [JSON.stringify(sharedUsers), table.id]);
      return res.json({ success: true, shared_users: sharedUsers });
    } catch (error) {
      logger.error("table_shared_user_remove_failed", { tableId: req.params.tableId, userId: req.user.id, targetUserId: req.params.userId, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/tables/:tableId/invite-code", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM tables WHERE id = $1", [req.params.tableId]);
      const table = result.rows[0];
      if (!table) return res.status(404).json({ error: "Table not found" });
      const workspaceResult = await db.query("SELECT * FROM workspaces WHERE id = $1", [table.workspace_id]);
      if (workspaceResult.rows[0]?.owner_id !== req.user.id) return res.status(403).json({ error: "Only workspace owners can manage invite codes" });
      let inviteCode = table.invite_code;
      if (!inviteCode) {
        inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await db.query("UPDATE tables SET invite_code = $1 WHERE id = $2", [inviteCode, table.id]);
      }
      return res.json({ invite_code: inviteCode });
    } catch (error) {
      logger.error("table_invite_code_create_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/tables/:tableId/invite-code", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM tables WHERE id = $1", [req.params.tableId]);
      const table = result.rows[0];
      if (!table) return res.status(404).json({ error: "Table not found" });
      const workspaceResult = await db.query("SELECT * FROM workspaces WHERE id = $1", [table.workspace_id]);
      if (workspaceResult.rows[0]?.owner_id !== req.user.id) return res.status(403).json({ error: "Only workspace owners can stop sharing" });
      await db.query("UPDATE tables SET invite_code = NULL, shared_users = '[]'::jsonb WHERE id = $1", [table.id]);
      return res.json({ success: true, message: "Sharing stopped and shared users removed" });
    } catch (error) {
      logger.error("table_invite_code_delete_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/tables/join", async (req, res) => {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "Invite code is required" });
    try {
      const result = await db.query("SELECT * FROM tables WHERE UPPER(invite_code) = $1", [inviteCode.toUpperCase()]);
      const table = result.rows[0];
      if (!table) return res.status(404).json({ error: "Invalid invite code" });
      const sharedUsers = Array.isArray(table.shared_users) ? table.shared_users : [];
      if (!sharedUsers.some((user) => user.userId === req.user.id)) {
        const workspaceResult = await db.query("SELECT owner_id FROM workspaces WHERE id=$1", [table.workspace_id]);
        const seatCheck = await billingService.assertSeatAvailable(workspaceResult.rows[0]?.owner_id, req.user.id);
        if (!seatCheck.allowed) {
          return res.status(402).json({ error: "Plan seat limit reached", code: "SEAT_LIMIT_REACHED", billing: seatCheck.status });
        }
        sharedUsers.push({ userId: req.user.id, permission: "edit" });
        await db.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [JSON.stringify(sharedUsers), table.id]);
      }
      return res.json({ success: true, tableId: table.id, workspaceId: table.workspace_id });
    } catch (error) {
      logger.error("table_join_failed", { inviteCode, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { createTableSharingRouter, normalizePermission };
