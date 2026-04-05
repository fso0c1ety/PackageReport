import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { sendPushNotification } from "../../../_lib/firebaseAdmin";
import { sendTableNotification } from "../../../_lib/notificationHelper";
import { sendEmail } from "../../../_lib/mailer";

export const runtime = "nodejs";

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

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

function formatAutomationValue(value) {
  if (value == null || value === "") {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getTaskName(table, values) {
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const taskCol = columns.find((column) => column.id === "task") || columns[0];
  const taskValue = taskCol ? values?.[taskCol.id] : values?.task;

  if (typeof taskValue === "string" && taskValue.trim()) {
    return taskValue.trim();
  }

  return "Task";
}

function getFileIdentifier(file) {
  return file?.url || file?.path || file?.storagePath || file?.name || file?.originalName || null;
}

async function maybeSendTaskNotifications({ table, user, taskId, oldValues, mergedValues }) {
  const messages = toArray(mergedValues?.message);
  const oldMessages = toArray(oldValues?.message);
  const taskName = getTaskName(table, mergedValues);

  if (messages.length > oldMessages.length) {
    const lastMsg = messages[messages.length - 1];
    const isScheduled = lastMsg?.scheduledFor && new Date(lastMsg.scheduledFor) > new Date();

    if (lastMsg && typeof lastMsg === "object") {
      lastMsg.notificationSent = !isScheduled;
    }

    if (!isScheduled && lastMsg) {
      const userName = lastMsg.sender || user.name || user.email || "User";
      const commentText = typeof lastMsg.text === "string" && lastMsg.text.trim()
        ? lastMsg.text.trim()
        : "left a new comment.";

      await sendTableNotification({
        table,
        senderId: user.id,
        type: "task_chat",
        title: "New Discussion",
        body: `${userName} commented on the ${taskName}: ${commentText}`,
        taskId,
        extraData: {
          taskName,
        },
      });
    }
  }

  const columns = Array.isArray(table?.columns) ? table.columns : [];
  for (const col of columns) {
    if (col?.type !== "Files" && col?.type !== "File") {
      continue;
    }

    const oldFiles = toArray(oldValues?.[col.id]);
    const newFiles = toArray(mergedValues?.[col.id]);

    for (const newFile of newFiles) {
      const fileKey = getFileIdentifier(newFile);
      const oldFile = oldFiles.find((candidate) => getFileIdentifier(candidate) === fileKey);
      const oldComments = toArray(oldFile?.comments);
      const newComments = toArray(newFile?.comments);

      if (newComments.length > oldComments.length) {
        const lastComment = newComments[newComments.length - 1];
        const userName = lastComment?.user || user.name || user.email || "User";
        const commentText = typeof lastComment?.text === "string" && lastComment.text.trim()
          ? lastComment.text.trim()
          : "left a new comment.";
        const fileName = newFile?.name || newFile?.originalName || "file";

        await sendTableNotification({
          table,
          senderId: user.id,
          type: "file_comment",
          title: "New File Comment",
          body: `${userName} commented on the ${fileName}: ${commentText}`,
          taskId,
          extraData: {
            fileName,
            taskName,
          },
        });
      }
    }
  }
}

async function runAutomations({ table, taskId, oldValues, newValues }) {
  const autoResult = await pool.query(
    `
      SELECT * FROM automations
      WHERE table_id = $1
        AND enabled = true
        AND (
          task_ids IS NULL
          OR jsonb_array_length(task_ids) = 0
          OR task_ids @> jsonb_build_array($2::text)
        )
      ORDER BY id ASC
    `,
    [table.id, taskId]
  );

  console.log(`[AUTOMATION][NEXT] Found ${autoResult.rows.length} matching automation(s) for task ${taskId}`);

  for (const automation of autoResult.rows) {
    const triggerCol = automation?.trigger_col;
    if (!triggerCol) {
      continue;
    }

    if (JSON.stringify(oldValues?.[triggerCol]) === JSON.stringify(newValues?.[triggerCol])) {
      continue;
    }

    const subject = `Task updated: ${table.name}`;
    const columns = Array.isArray(table.columns) ? table.columns : [];
    const automationCols = toArray(automation.cols);
    const recipients = toArray(automation.recipients)
      .map((recipient) => String(recipient || "").trim())
      .filter(Boolean);
    const actionType = automation.action_type || "email";

    if (recipients.length === 0) {
      console.warn("[AUTOMATION][NEXT] Skipping automation with no recipients:", automation.id);
      continue;
    }

    let htmlRows = "";
    const textSummaryLines = [];

    for (const colId of automationCols) {
      const col = columns.find((column) => column.id === colId);
      if (!col) {
        continue;
      }

      const formattedValue = formatAutomationValue(newValues?.[colId]);
      htmlRows += `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px; font-weight: 500; width: 40%; vertical-align: top;">${col.name}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600; vertical-align: top;">${formattedValue}</td>
        </tr>
      `;
      textSummaryLines.push(`${col.name}: ${formattedValue}`);
    }

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
        An update occurred in the <strong style="color: #2563eb;">${table.name}</strong> table. The recorded changes are listed below:
      </p>
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; background-color: #fafafa;">
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    </div>
  </div>
</div>`;

    const logRes = await pool.query(
      `
        INSERT INTO activity_logs (recipients, subject, html, timestamp, table_id, task_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [JSON.stringify(recipients), subject, html, Date.now(), table.id, taskId, "pending"]
    );

    const logId = logRes.rows[0]?.id;
    let successEmail = true;
    let successNotif = true;
    const errorMessages = [];

    if (actionType === "email" || actionType === "both") {
      try {
        console.log("[AUTOMATION][NEXT] Sending email automation...");
        await sendEmail({
          to: recipients,
          subject,
          text: textSummary,
          html,
        });
      } catch (mailErr) {
        successEmail = false;
        console.error("[AUTOMATION][NEXT] Email send failed:", mailErr);
        errorMessages.push(`Email: ${mailErr.message || mailErr}`);
      }
    }

    if (actionType === "notification" || actionType === "both") {
      try {
        console.log("[AUTOMATION][NEXT] Sending push automation...");
        const normalizedRecipients = recipients.map((email) => email.toLowerCase());
        const userRes = await pool.query(
          "SELECT id, email, fcm_token, fcm_tokens FROM users WHERE LOWER(email) = ANY($1)",
          [normalizedRecipients]
        );

        const matchedUsers = userRes.rows;
        const tokenSet = new Set();

        for (const matchedUser of matchedUsers) {
          await pool.query(
            `
              INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `,
            [
              uuidv4(),
              matchedUser.id,
              null,
              "automation",
              {
                subject,
                body: textSummary,
                tableName: table.name,
                tableId: table.id,
                taskId,
                logId,
              },
              false,
            ]
          );

          if (matchedUser.fcm_token) {
            tokenSet.add(matchedUser.fcm_token);
          }

          for (const token of toArray(matchedUser.fcm_tokens)) {
            if (token) {
              tokenSet.add(token);
            }
          }
        }

        const tokens = Array.from(tokenSet);
        if (tokens.length > 0) {
          await sendPushNotification(tokens, subject, textSummary || "Task updated.", {
            type: "automation",
            tableId: table.id,
            workspaceId: table.workspace_id,
            taskId,
            logId,
          });
        } else if (matchedUsers.length === 0) {
          console.warn("[AUTOMATION][NEXT] No users matched the automation recipient emails.");
        }
      } catch (pushErr) {
        successNotif = false;
        console.error("[AUTOMATION][NEXT] Push send failed:", pushErr);
        errorMessages.push(`Notification: ${pushErr.message || pushErr}`);
      }
    }

    const finalStatus = !successEmail || !successNotif || errorMessages.length > 0 ? "error" : "sent";
    await pool.query(
      "UPDATE activity_logs SET status = $1, error_message = $2 WHERE id = $3",
      [finalStatus, errorMessages.length > 0 ? errorMessages.join("; ") : null, logId]
    );
  }
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;

    const accessRes = await pool.query(
      `
        SELECT t.id
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.id = $1
          AND (
            w.owner_id = $2
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(t.shared_users) AS elem
              WHERE elem->>'userId' = $2
            )
          )
      `,
      [tableId, user.id]
    );

    if (accessRes.rows.length === 0) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    const result = await pool.query(
      "SELECT * FROM rows WHERE table_id = $1 ORDER BY (values->>'order')::int ASC NULLS FIRST, created_at DESC",
      [tableId]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[TABLE TASKS][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const body = await req.json();

    const accessRes = await pool.query(
      `
        SELECT t.id
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.id = $1
          AND (
            w.owner_id = $2
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(t.shared_users) AS elem
              WHERE elem->>'userId' = $2
            )
          )
      `,
      [tableId, user.id]
    );

    if (accessRes.rows.length === 0) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    const newTaskId = uuidv4();
    const values = body?.values && typeof body.values === "object" ? body.values : {};

    const insertRes = await pool.query(
      `
        INSERT INTO rows (id, table_id, values, created_by, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `,
      [newTaskId, tableId, JSON.stringify(values), user.id]
    );

    return NextResponse.json(insertRes.rows[0], { status: 201 });
  } catch (err) {
    console.error("[TABLE TASKS][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const body = await req.json();
    const id = body?.id;
    const values = body?.values;

    if (!id || !values || typeof values !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const tableRes = await pool.query(
      `
        SELECT t.*
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.id = $1
          AND (
            w.owner_id = $2
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(t.shared_users) AS elem
              WHERE elem->>'userId' = $2
            )
          )
      `,
      [tableId, user.id]
    );

    const table = tableRes.rows[0];
    if (!table) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    const rowRes = await pool.query(
      "SELECT * FROM rows WHERE id = $1 AND table_id = $2",
      [id, tableId]
    );

    const row = rowRes.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const oldValues = row.values || {};
    const newValues = values || {};
    const timestamp = new Date().toISOString();
    const oldActivity = toArray(oldValues.activity);
    const newActivity = [];
    const columns = Array.isArray(table.columns) ? table.columns : [];

    for (const [key, newValue] of Object.entries(newValues)) {
      if (key === "message" || key === "activity") {
        continue;
      }

      const oldValue = oldValues[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        const col = columns.find((column) => column.id === key);
        const colName = col ? col.name : key;
        let logText = `Updated ${colName}`;

        if (newValue !== null && typeof newValue !== "object") {
          logText += ` to \"${newValue}\"`;
        }

        newActivity.push({
          text: logText,
          time: timestamp,
          user: user.name || user.email || "User",
        });
      }
    }

    const mergedValues = { ...oldValues, ...newValues };
    mergedValues.activity = newActivity.length > 0 ? [...newActivity, ...oldActivity] : oldActivity;

    try {
      await maybeSendTaskNotifications({
        table,
        user,
        taskId: id,
        oldValues,
        mergedValues,
      });
    } catch (notificationErr) {
      console.error("[TABLE TASKS][PUT] Notification processing failed:", notificationErr);
    }

    const updateRes = await pool.query(
      `
        UPDATE rows
        SET values = $1::jsonb
        WHERE id = $2 AND table_id = $3
        RETURNING *
      `,
      [JSON.stringify(mergedValues), id, tableId]
    );

    try {
      await runAutomations({
        table,
        taskId: id,
        oldValues,
        newValues: mergedValues,
      });
    } catch (automationErr) {
      console.error("[TABLE TASKS][PUT] Automation processing failed after task save:", automationErr);
    }

    return NextResponse.json({ success: true, task: updateRes.rows[0] });
  } catch (err) {
    console.error("[TABLE TASKS][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
