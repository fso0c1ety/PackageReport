import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { sendEmail } from "../../_lib/mailer";
import automationBuilder from "../../../../../server/services/automationBuilderEngine.cjs";

export const runtime = "nodejs";

const asArray = (value) => Array.isArray(value) ? value : [];

async function ensureRunSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_runs (
      id TEXT PRIMARY KEY,
      automation_id TEXT NOT NULL,
      table_id TEXT,
      row_id TEXT,
      idempotency_key TEXT,
      trigger_type TEXT,
      input JSONB DEFAULT '{}'::jsonb,
      actions JSONB DEFAULT '[]'::jsonb,
      output JSONB DEFAULT '{}'::jsonb,
      scheduled_for TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      attempt INTEGER DEFAULT 1,
      max_attempts INTEGER DEFAULT 3,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE automation_runs
      ADD COLUMN IF NOT EXISTS table_id TEXT,
      ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
      ADD COLUMN IF NOT EXISTS trigger_type TEXT,
      ADD COLUMN IF NOT EXISTS input JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS output JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS attempt INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
    CREATE UNIQUE INDEX IF NOT EXISTS automation_runs_idempotency_key_idx ON automation_runs(idempotency_key) WHERE idempotency_key IS NOT NULL
  `);
}

function scheduledMoment(value, triggerType, minutesBefore) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (["reminder", "date_approaching"].includes(triggerType)) parsed.setMinutes(parsed.getMinutes() - minutesBefore);
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
      SELECT a.*, t.name AS table_name, t.columns, t.workspace_id, r.id AS row_id, r.values,
        COALESCE(a.definition->'trigger'->>'type',a.trigger_type) AS effective_trigger_type,
        COALESCE(a.definition->'trigger'->>'columnId',a.trigger_col) AS effective_trigger_col
      FROM automations a
      JOIN tables t ON t.id = a.table_id
      JOIN workspaces w ON w.id = t.workspace_id
      JOIN rows r ON r.table_id = t.id
      WHERE a.enabled = TRUE
        AND COALESCE(a.definition->'trigger'->>'type',a.trigger_type) IN ('date_arrives', 'date_approaching', 'reminder')
        AND (w.owner_id = $1 OR COALESCE(t.shared_users, '[]'::jsonb) @> $2::jsonb)
        AND (a.task_ids IS NULL OR jsonb_array_length(a.task_ids) = 0 OR a.task_ids @> jsonb_build_array(r.id::text))
    `, [String(user.id), JSON.stringify([{ userId: String(user.id) }])]);

    const now = new Date();
    const triggered = [];
    for (const item of result.rows) {
      const definition = item.definition && Object.keys(item.definition).length ? automationBuilder.normalizeAutomationDefinition(item.definition) : null;
      const config = definition?.trigger?.config || (item.action_config && typeof item.action_config === "object" ? item.action_config : {});
      const rawValue = item.values?.[item.effective_trigger_col];
      const scheduled = scheduledMoment(rawValue, item.effective_trigger_type, Math.max(0, Number(config.minutesBefore) || 0));
      if (!scheduled || !isDue(rawValue, scheduled, now)) continue;
      const scheduledKey = `${item.id}:${item.row_id}:${item.effective_trigger_type}:${String(rawValue)}:${Number(config.minutesBefore) || 0}`;
      const claim = await pool.query(`
        INSERT INTO automation_runs (id,automation_id,table_id,row_id,idempotency_key,trigger_type,input,actions,scheduled_for,status,started_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,'running',NOW())
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      `, [randomUUID(), String(item.id), item.table_id, item.row_id, scheduledKey, item.effective_trigger_type, JSON.stringify({ values: item.values, scheduledFor: rawValue }), JSON.stringify(definition?.actions || []), scheduled]);
      if (claim.rows.length === 0) continue;

      const columns = asArray(item.columns);
      const titleColumn = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
      const rowName = String(item.values?.[titleColumn?.id] || "Board item");
      const subject = `${item.effective_trigger_type === "date_arrives" ? "Date reached" : "Reminder"}: ${rowName}`;
      const body = `${subject} in ${item.table_name}.`;
      const recipients = asArray(item.recipients).map(String).filter(Boolean);
      let status = "sent";
      let errorMessage = null;
      try {
        if (definition) {
          const plan = automationBuilder.buildExecutionPlan(definition, { type: item.effective_trigger_type, columnId: item.effective_trigger_col, newValues: item.values }, { currentUserId: user.id });
          if (!plan.matched) throw new Error("Automation conditions no longer match");
          for (const action of plan.actions) {
            const actionConfig = action.config || {};
            if (action.type === "send_email") await sendEmail({ to: actionConfig.recipients || recipients, subject, text: body });
            else if (action.type === "send_notification") {
              const users = await pool.query("SELECT id FROM users WHERE LOWER(email)=ANY($1)", [(actionConfig.recipients || recipients).map((email) => String(email).toLowerCase())]);
              for (const recipient of users.rows) await pool.query("INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at) VALUES($1,$2,NULL,'automation',$3::jsonb,FALSE,NOW())", [randomUUID(), recipient.id, JSON.stringify({ title: subject, body, tableId: item.table_id, taskId: item.row_id })]);
            } else if (["update_field", "assign_user"].includes(action.type)) await pool.query("UPDATE rows SET values=jsonb_set(COALESCE(values,'{}'::jsonb),$1,$2::jsonb,true),updated_at=NOW() WHERE id=$3 AND table_id=$4", [`{${action.columnId}}`, JSON.stringify(actionConfig.value ?? action.value ?? null), item.row_id, item.table_id]);
            else if (["create_row", "create_task"].includes(action.type)) await pool.query("INSERT INTO rows(id,table_id,values,created_by,created_at) VALUES($1,$2,$3::jsonb,$4,NOW())", [randomUUID(), actionConfig.tableId || item.table_id, JSON.stringify(actionConfig.values || { [titleColumn.id]: actionConfig.taskName || `Follow up: ${rowName}` }), item.created_by || user.id]);
            else if (action.type === "add_comment") await pool.query("INSERT INTO item_comments(id,row_id,user_id,body,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW())", [randomUUID(), item.row_id, item.created_by || user.id, String(actionConfig.body || action.value || "Automated reminder").slice(0,5000)]);
            else if (action.type === "archive_row") await pool.query("UPDATE rows SET archived_at=NOW(),updated_at=NOW() WHERE id=$1 AND table_id=$2", [item.row_id, item.table_id]);
            else throw new Error(`Scheduled action ${action.type} is not supported`);
          }
        } else {
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
        }
        triggered.push({ automationId: item.id, rowId: item.row_id, actionType: item.action_type });
      } catch (error) {
        status = "error";
        errorMessage = error?.message || String(error);
      }
      await pool.query("UPDATE automation_runs SET status=$1,error_message=$2,finished_at=NOW() WHERE id=$3", [status === "sent" ? "success" : "failed", errorMessage, claim.rows[0].id]);
      await pool.query("UPDATE automations SET last_run_at=NOW(),run_count=COALESCE(run_count,0)+1,failure_count=COALESCE(failure_count,0)+$1 WHERE id=$2", [status === "sent" ? 0 : 1, item.id]);
    }
    return NextResponse.json({ checked: result.rows.length, triggered });
  } catch (error) {
    console.error("[AUTOMATION][DUE]", error);
    return NextResponse.json({ error: "Unable to process scheduled automations" }, { status: 500 });
  }
}
