const express = require("express");

function createNotificationsRouter({ db, logger }) {
  const router = express.Router();

  router.get("/notifications", async (req, res) => {
    try {
      const result = await db.query(`
        SELECT n.*, u.name as sender_name, u.avatar as sender_avatar
        FROM notifications n LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.recipient_id = $1 ORDER BY n.read ASC, n.created_at DESC LIMIT 50
      `, [req.user.id]);
      const tableIds = [...new Set(result.rows.map((notification) => notification.data)
        .filter((data) => !data?.workspaceId && typeof data?.tableId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.tableId))
        .map((data) => data.tableId))];
      const workspaceByTable = new Map();
      if (tableIds.length) {
        try {
          const tables = await db.query("SELECT id, workspace_id FROM tables WHERE id::text = ANY($1::text[])", [tableIds]);
          for (const table of tables.rows) workspaceByTable.set(String(table.id), table.workspace_id);
        } catch (error) {
          logger.warn("notification_workspace_enrichment_failed", { error: error.message });
        }
      }
      const notifications = result.rows.map((notification) => {
        const data = { ...(notification.data || {}) };
        if (!data.workspaceId && data.tableId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.tableId)) {
          if (workspaceByTable.has(data.tableId)) data.workspaceId = workspaceByTable.get(data.tableId);
        }
        return { ...notification, data };
      });
      return res.json(notifications);
    } catch (error) {
      logger.error("notifications_fetch_failed", { requestId: req.requestId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/notifications/mark-read", async (req, res) => {
    try {
      await db.query("UPDATE notifications SET read = true WHERE recipient_id = $1", [req.user.id]);
      return res.json({ success: true });
    } catch (error) {
      logger.error("notifications_mark_read_failed", { userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/notifications/:id/accept", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM notifications WHERE id = $1 AND recipient_id = $2", [req.params.id, req.user.id]);
      const notification = result.rows[0];
      if (!notification) return res.status(404).json({ error: "Notification not found" });
      if (notification.type !== "invite") return res.status(400).json({ error: "Not an invite" });
      const { tableId, permission } = notification.data || {};
      if (!tableId) return res.status(400).json({ error: "Invalid invite data" });
      const tableResult = await db.query("SELECT * FROM tables WHERE id = $1", [tableId]);
      const table = tableResult.rows[0];
      if (table) {
        const sharedUsers = Array.isArray(table.shared_users) ? table.shared_users : [];
        if (!sharedUsers.some((user) => user.userId === req.user.id)) {
          sharedUsers.push({ userId: req.user.id, permission: permission || "edit" });
          await db.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [JSON.stringify(sharedUsers), tableId]);
        }
      }
      await db.query("DELETE FROM notifications WHERE id = $1", [req.params.id]);
      return res.json({ success: true, message: "Invite accepted" });
    } catch (error) {
      logger.error("notification_invite_accept_failed", { notificationId: req.params.id, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/notifications/:id/decline", async (req, res) => {
    try {
      await db.query("DELETE FROM notifications WHERE id = $1 AND recipient_id = $2", [req.params.id, req.user.id]);
      return res.json({ success: true, message: "Invite declined" });
    } catch (error) {
      logger.error("notification_invite_decline_failed", { notificationId: req.params.id, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { createNotificationsRouter };
