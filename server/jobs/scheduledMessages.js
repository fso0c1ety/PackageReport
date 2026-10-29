async function processScheduledMessages({ db, sendNotification, logger }) {
  const lock = await db.query("SELECT pg_try_advisory_lock(hashtext('smartmanage:scheduled-messages:v1')) AS acquired");
  if (!lock.rows[0]?.acquired) return { processed: 0, skipped: "already-running" };

  let processed = 0;
  try {
  const result = await db.query(`
    SELECT r.id, r.table_id, r.values
    FROM rows r
    WHERE r.values::text LIKE '%"scheduledFor"%'
  `);

  for (const row of result.rows) {
    let changed = false;
    const messages = row.values.message;
    if (!Array.isArray(messages)) continue;

    const tableResult = await db.query(
      "SELECT id, name, workspace_id, columns, shared_users FROM tables WHERE id = $1",
      [row.table_id],
    );
    const table = tableResult.rows[0];
    if (!table) continue;

    for (const message of messages) {
      if (!message.scheduledFor || message.notificationSent || new Date(message.scheduledFor) > new Date()) continue;
      const taskColumn = Array.isArray(table.columns)
        ? table.columns.find((column) => column.id === "task") || table.columns[0]
        : null;
      const taskName = (taskColumn && row.values[taskColumn.id]) || row.values.task || "Task";
      await sendNotification(
        "New Discussion",
        `${message.sender || "System"} commented on the ${taskName}: ${message.text}`,
        "task_chat",
        { taskId: row.id, scheduledMessageId: message.id || `${row.id}:${message.scheduledFor}` },
        table,
        null,
      );
      message.notificationSent = true;
      changed = true;
      processed += 1;
    }

    if (changed) {
      await db.query("UPDATE rows SET values = $1 WHERE id = $2", [JSON.stringify(row.values), row.id]);
      logger.info("scheduled_messages_processed", { taskId: row.id });
    }
  }
  return { processed };
  } finally {
    await db.query("SELECT pg_advisory_unlock(hashtext('smartmanage:scheduled-messages:v1'))").catch(() => {});
  }
}

function startScheduledMessageJob(dependencies, intervalMs = 60000) {
  const timer = setInterval(() => {
    processScheduledMessages(dependencies).catch((error) => {
      dependencies.logger.error("scheduled_messages_failed", { error: error.message });
    });
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

module.exports = { processScheduledMessages, startScheduledMessageJob };
