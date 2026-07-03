const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { sendEmail } = require("../mailer");
const { sendPushNotification } = require("../firebase");
const { parseJsonArray } = require("../utils/parseJsonArray");
const { escapeHtml, formatCellValue } = require("../utils/formatCellValue");

function buildAutomationEmail(table, columns, colIds, values) {
  let htmlRows = "";
  const textSummaryLines = [];

  colIds.forEach((colId) => {
    const col = columns.find((c) => c.id === colId);
    if (!col) return;

    const val = formatCellValue(values[colId], col);
    const safeColumnName = escapeHtml(col.name);
    const safeValue = escapeHtml(val);

    htmlRows += `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px; font-weight: 500; width: 40%; vertical-align: top;">${safeColumnName}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600; vertical-align: top;">${safeValue}</td>
      </tr>
    `;
    textSummaryLines.push(`${col.name}: ${val}`);
  });

  const textSummary = textSummaryLines.length > 0 ? textSummaryLines.join("\n") : "Check task for details.";
  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; background-color: #f3f4f6; color: #111827;">
  <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">Smart Manage</h1>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="margin-top: 0; color: #1f2937; font-size: 22px; font-weight: 600; margin-bottom: 16px;">Task Updated</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
        An update occurred in the <strong style="color: #2563eb;">${escapeHtml(table.name)}</strong> table. The recorded changes are listed below:
      </p>
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; background-color: #fafafa;">
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
          This is an automated notification from your <strong>Smart Manage</strong> workspace.
        </p>
      </div>
    </div>
  </div>
</div>`;

  return { html, textSummary };
}

async function deliverAutomation({ automation, table, rowId, values }) {
  const actionType = automation.action_type || "email";
  const recipients = parseJsonArray(automation.recipients).filter(Boolean);
  const colIds = parseJsonArray(automation.cols);
  let columns = table.columns;
  if (typeof columns === "string") {
    try {
      columns = JSON.parse(columns);
    } catch {
      columns = [];
    }
  }
  if (!Array.isArray(columns)) {
    columns = [];
  }

  if (actionType === "set_status") {
    const [columnId, value] = colIds;
    if (!columnId) return { skipped: true, reason: "missing_status_column" };
    await db.query(
      "UPDATE rows SET values = jsonb_set(values, $1, $2::jsonb, true), updated_at = NOW() WHERE id = $3 AND table_id = $4",
      [`{${columnId}}`, JSON.stringify(value || "Done"), rowId, table.id]
    );
    return { success: true };
  }

  if (recipients.length === 0) {
    return { skipped: true, reason: "no_recipients" };
  }

  const subject = `Task updated: ${table.name}`;
  const notificationTitle = "Automation Alert";
  const notificationBody = "Check task for details.";
  const { html, textSummary } = buildAutomationEmail(table, columns, colIds, values);

  const logRes = await db.query(
    `INSERT INTO activity_logs (recipients, subject, html, timestamp, table_id, task_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [JSON.stringify(recipients), subject, html, new Date().toISOString(), table.id, rowId]
  );
  const logId = logRes.rows[0].id;

  let successEmail = true;
  let successNotif = true;
  const errorMessages = [];

  // Persist the in-app notification first. Email providers can be slow or
  // unavailable and must not delay the realtime app alert.
  if (actionType === "notification" || actionType === "both") {
    try {
      const userRes = await db.query(
        "SELECT id, email, fcm_token, fcm_tokens FROM users WHERE email = ANY($1)",
        [recipients]
      );

      const fcmTokens = new Set();
      for (const user of userRes.rows) {
        await db.query(
          `INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            uuidv4(),
            user.id,
            null,
            "automation",
            {
              title: notificationTitle,
              subject,
              body: notificationBody,
              tableName: table.name,
              tableId: table.id,
              taskId: rowId,
              logId,
            },
            false,
          ]
        );

        if (user.fcm_token) fcmTokens.add(user.fcm_token);
        if (Array.isArray(user.fcm_tokens)) {
          user.fcm_tokens.forEach((token) => {
            if (token) fcmTokens.add(token);
          });
        }
      }

      const tokensArray = Array.from(fcmTokens);
      if (tokensArray.length > 0) {
        await sendPushNotification(tokensArray, notificationTitle, `${subject}\n${notificationBody}`, {
          type: "automation",
          tableId: table.id.toString(),
          workspaceId: table.workspace_id,
          taskId: rowId.toString(),
        });
      }
    } catch (notifErr) {
      successNotif = false;
      errorMessages.push(`Notification: ${notifErr.message || notifErr}`);
    }
  }

  if (actionType === "email" || actionType === "both") {
    try {
      await sendEmail({ to: recipients, subject, html });
    } catch (mailErr) {
      successEmail = false;
      errorMessages.push(`Email: ${mailErr.message || mailErr}`);
    }
  }

  const finalStatus = successEmail && successNotif ? "sent" : "error";
  const finalErrorMsg = errorMessages.length > 0 ? errorMessages.join("; ") : null;
  await db.query("UPDATE activity_logs SET status = $1, error_message = $2 WHERE id = $3", [
    finalStatus,
    finalErrorMsg,
    logId,
  ]);

  if (!successEmail || !successNotif) {
    throw new Error(finalErrorMsg || "Automation delivery failed");
  }

  return { success: true, logId };
}

module.exports = {
  buildAutomationEmail,
  deliverAutomation,
  parseJsonArray,
};
