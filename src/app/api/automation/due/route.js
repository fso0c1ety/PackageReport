import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { sendEmail } from "../../_lib/mailer";

export const runtime = "nodejs";

const asArray = (value) => Array.isArray(value) ? value : [];

async function ensureRunSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_runs (
      id TEXT PRIMARY KEY,
      automation_id TEXT NOT NULL,
      row_id TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (automation_id, row_id, scheduled_for)
    )
  `);
}

function scheduledMoment(value, triggerType, minutesBefore) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (triggerType === "reminder") parsed.setMinutes(parsed.getMinutes() - minutesBefore);
  return parsed;
}

function isDue(rawValue, scheduled, now) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(rawValue));
  if (dateOnly) return scheduled.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  return scheduled.getTime() <= now.getTime() && scheduled.getTime() >= now.getTime() - 5 * 60 * 1000;
}

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureRunSchema();
    const result = await pool.query(`
      SELECT a.*, t.name AS table_name, t.columns, t.workspace_id, r.id AS row_id, r.values
      FROM automations a
      JOIN tables t ON t.id = a.table_id
      JOIN workspaces w ON w.id = t.workspace_id
      JOIN rows r ON r.table_id = t.id
      WHERE a.enabled = TRUE
        AND a.trigger_type IN ('date_arrives', 'reminder')
        AND (w.owner_id = $1 OR COALESCE(t.shared_users, '[]'::jsonb) @> $2::jsonb)
        AND (a.task_ids IS NULL OR jsonb_array_length(a.task_ids) = 0 OR a.task_ids @> jsonb_build_array(r.id::text))
    `, [String(user.id), JSON.stringify([{ userId: String(user.id) }])]);

    const now = new Date();
    const triggered = [];
    for (const item of result.rows) {
      const config = item.action_config && typeof item.action_config === "object" ? item.action_config : {};
      const rawValue = item.values?.[item.trigger_col];
      const scheduled = scheduledMoment(rawValue, item.trigger_type, Math.max(0, Number(config.minutesBefore) || 0));
      if (!scheduled || !isDue(rawValue, scheduled, now)) continue;
      const scheduledKey = `${item.trigger_type}:${String(rawValue)}:${Number(config.minutesBefore) || 0}`;
      const claim = await pool.query(`
        INSERT INTO automation_runs (id, automation_id, row_id, scheduled_for)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (automation_id,row_id,scheduled_for) DO NOTHING
        RETURNING id
      `, [randomUUID(), String(item.id), item.row_id, scheduledKey]);
      if (claim.rows.length === 0) continue;

      const columns = asArray(item.columns);
      const titleColumn = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
      const rowName = String(item.values?.[titleColumn?.id] || "Board item");
      const subject = `${item.trigger_type === "reminder" ? "Reminder" : "Date reached"}: ${rowName}`;
      const body = `${subject} in ${item.table_name}.`;
      const recipients = asArray(item.recipients).map(String).filter(Boolean);
      let status = "sent";
      let errorMessage = null;
      try {
        if (["email", "both"].includes(item.action_type)) await sendEmail({ to: recipients, subject, text: body });
        if (["notification", "both"].includes(item.action_type)) {
          const users = await pool.query("SELECT id FROM users WHERE LOWER(email)=ANY($1)", [recipients.map((email) => email.toLowerCase())]);
          for (const recipient of users.rows) {
            await pool.query(`INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at)
              VALUES($1,$2,NULL,'automation',$3::jsonb,FALSE,NOW())`, [randomUUID(), recipient.id, JSON.stringify({ title: subject, body, tableId: item.table_id, taskId: item.row_id })]);
          }
        }
        if (item.action_type === "webhook") {
          const response = await fetch(String(config.webhookUrl), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: item.trigger_type, boardId: item.table_id, rowId: item.row_id, scheduledFor: rawValue, values: item.values }) });
          if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
        }
        if (item.action_type === "create_task") {
          await pool.query("INSERT INTO rows(id,table_id,values,created_by,created_at) VALUES($1,$2,$3,$4,NOW())", [randomUUID(), item.table_id, JSON.stringify({ [titleColumn.id]: String(config.taskName || `Follow up: ${rowName}`) }), item.created_by || user.id]);
        }
        triggered.push({ automationId: item.id, rowId: item.row_id, actionType: item.action_type });
      } catch (error) {
        status = "error";
        errorMessage = error?.message || String(error);
      }
      await pool.query("UPDATE automation_runs SET status=$1,error_message=$2 WHERE automation_id=$3 AND row_id=$4 AND scheduled_for=$5", [status, errorMessage, String(item.id), item.row_id, scheduledKey]);
    }
    return NextResponse.json({ checked: result.rows.length, triggered });
  } catch (error) {
    console.error("[AUTOMATION][DUE]", error);
    return NextResponse.json({ error: "Unable to process scheduled automations" }, { status: 500 });
  }
}
