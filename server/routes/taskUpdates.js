const express = require("express");

async function notifyDiscussion({ newValues, oldValues, req, rowId, sendNotification, table, logger }) {
  if (!Array.isArray(newValues.message)) return;
  const oldLength = Array.isArray(oldValues.message) ? oldValues.message.length : 0;
  if (newValues.message.length <= oldLength) return;
  const message = newValues.message[newValues.message.length - 1];
  const scheduled = message.scheduledFor && new Date(message.scheduledFor) > new Date();
  message.notificationSent = !scheduled;
  if (scheduled) {
    logger.info("task_message_scheduled", { rowId, scheduledFor: message.scheduledFor });
    return;
  }
  let taskName = "Task";
  if (Array.isArray(table.columns)) {
    const taskColumn = table.columns.find((column) => column.id === "task") || table.columns[0];
    if (taskColumn && newValues[taskColumn.id]) taskName = newValues[taskColumn.id];
  } else if (newValues.task) {
    taskName = newValues.task;
  }
  const userName = message.sender || req.user?.name || "User";
  try {
    await sendNotification(
      "New Discussion",
      `${userName} commented on the ${taskName}: ${message.text}`,
      "task_chat",
      { taskId: rowId },
      table,
      req.user?.id || null,
    );
  } catch (error) {
    logger.error("task_chat_notification_failed", { rowId, error: error.message });
  }
}

async function notifyFileComments({ newValues, oldValues, req, rowId, sendNotification, table, logger }) {
  if (!Array.isArray(table.columns)) return;
  for (const column of table.columns) {
    if (column.type !== "Files" && column.type !== "File") continue;
    const oldFiles = Array.isArray(oldValues?.[column.id]) ? oldValues[column.id] : [];
    const newFiles = Array.isArray(newValues?.[column.id]) ? newValues[column.id] : [];
    for (const file of newFiles) {
      const oldFile = oldFiles.find((candidate) => candidate.url === file.url);
      if (!oldFile || !Array.isArray(file.comments)) continue;
      const oldLength = Array.isArray(oldFile.comments) ? oldFile.comments.length : 0;
      if (file.comments.length <= oldLength) continue;
      const comment = file.comments[file.comments.length - 1];
      const userName = comment.user || req.user?.name || "User";
      try {
        await sendNotification(
          "New File Comment",
          `${userName} commented on the ${file.name || "File"}: ${comment.text}`,
          "file_comment",
          { taskId: rowId },
          table,
          req.user?.id || null,
        );
      } catch (error) {
        logger.error("file_comment_notification_failed", { rowId, fileUrl: file.url, error: error.message });
      }
    }
  }
}

function activityChanges(table, oldValues, newValues, timestamp) {
  return Object.keys(newValues).flatMap((key) => {
    if (key === "message" || key === "activity" || JSON.stringify(oldValues[key]) === JSON.stringify(newValues[key])) return [];
    const column = Array.isArray(table.columns) ? table.columns.find((candidate) => candidate.id === key) : null;
    let text = `Updated ${column ? column.name : key}`;
    if (newValues[key] !== null && typeof newValues[key] !== "object") text += ` to "${newValues[key]}"`;
    return [{ text, time: timestamp, user: "User" }];
  });
}

function createTaskUpdatesRouter({ appQueue, db, logger, requireRowPermission, sendNotification }) {
  const router = express.Router();

  router.put("/tables/:tableId/tasks", requireRowPermission("editor"), async (req, res) => {
    try {
      const { id, values } = req.body;
      if (!id || typeof values !== "object") return res.status(400).json({ error: "Invalid request body" });
      const table = req.table;
      const row = req.row;

      const oldValues = row.values || {};
      const newValues = values || {};
      await notifyDiscussion({ newValues, oldValues, req, rowId: id, sendNotification, table, logger });
      await notifyFileComments({ newValues, oldValues, req, rowId: id, sendNotification, table, logger });

      const changes = activityChanges(table, oldValues, newValues, new Date().toISOString());
      const mergedValues = { ...oldValues, ...newValues };
      mergedValues.activity = changes.length ? [...changes, ...(oldValues.activity || [])] : (oldValues.activity || []);
      const updated = await db.query(
        "UPDATE rows SET values = $1 WHERE id = $2 AND table_id = $3 RETURNING *",
        [JSON.stringify(mergedValues), id, req.params.tableId],
      );
      if (updated.rowCount === 0) return res.status(404).json({ error: "Task not found" });

      const eventId = `row-update:${table.id}:${id}:${Date.now()}`;
      appQueue.add("automation.run", { table, rowId: id, oldValues, newValues: mergedValues, eventId }, {
        idempotencyKey: eventId,
      }).catch((error) => logger.error("automation_queue_enqueue_failed", { tableId: table.id, rowId: id, error: error.message }));
      logger.info("table_row_updated", { tableId: table.id, rowId: id, userId: req.user.id });
      return res.json({ success: true, task: updated.rows[0] });
    } catch (error) {
      logger.error("task_update_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { activityChanges, createTaskUpdatesRouter, notifyDiscussion, notifyFileComments };
