import { NextResponse } from "next/server";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { pool, SECRET_KEY } from "../../_lib/server";
import { sendEmail } from "../../_lib/mailer";
import automationBuilder from "../../../../../server/services/automationBuilderEngine.cjs";

export const runtime = "nodejs";

const asArray = (value) => Array.isArray(value) ? value : [];

const SCHEDULER_LOCK = "scheduled-automations";
const SCHEDULER_LEASE_SECONDS = 600;
const SCHEDULER_PURPOSE = "smart-manage:scheduled-automations:v1";

function isAuthorizedSchedulerRequest(req) {
  if (!SECRET_KEY) return false;
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = createHmac("sha256", SECRET_KEY).update(SCHEDULER_PURPOSE).digest("hex");
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

async function acquireSchedulerLock(token) {
  const result = await pool.query(`
    INSERT INTO scheduler_locks(name,token,locked_until,updated_at)
    VALUES($1,$2,NOW()+($3::text || ' seconds')::interval,NOW())
    ON CONFLICT(name) DO UPDATE SET
      token=EXCLUDED.token,
      locked_until=EXCLUDED.locked_until,
      updated_at=NOW()
    WHERE scheduler_locks.locked_until <= NOW()
    RETURNING token
  `, [SCHEDULER_LOCK, token, SCHEDULER_LEASE_SECONDS]);
  return result.rowCount === 1;
}

async function releaseSchedulerLock(token) {
  await pool.query(
    "UPDATE scheduler_locks SET locked_until=NOW(),updated_at=NOW() WHERE name=$1 AND token=$2",
    [SCHEDULER_LOCK, token],
  );
}

async function processCalendarReminders() {
  const due = await pool.query(`
    UPDATE calendar_events
    SET reminder_sent_at=NOW()
    WHERE reminder_sent_at IS NULL
      AND starts_at<=NOW() AND starts_at>=NOW()-INTERVAL '24 hours'
    RETURNING id,user_id,title,event_type
  `);
  for (const event of due.rows) {
    await pool.query(`INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at)
      VALUES($1,$2,NULL,'calendar_reminder',$3::jsonb,FALSE,NOW())`, [
      randomUUID(),
      event.user_id,
      JSON.stringify({ title: `Reminder: ${event.title}`, message: `${event.event_type} is starting now`, eventId: event.id, href: "/calendar" }),
    ]);
  }
  return due.rowCount;
}

export async function GET(req) {
  if (!isAuthorizedSchedulerRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lockToken = randomUUID();
  let hasLock = false;

  try {
    hasLock = await acquireSchedulerLock(lockToken);
    if (!hasLock) return NextResponse.json({ checked: 0, triggered: [], skipped: "already-running" });
    const calendarReminders = await processCalendarReminders();
    const result = await pool.query(`
      WITH configured AS (
        SELECT a.*, t.name AS table_name, t.columns, t.workspace_id, t.shared_users,
          w.owner_id AS workspace_owner_id,
          COALESCE(a.definition->'trigger'->>'type',a.trigger_type) AS effective_trigger_type,
          COALESCE(a.definition->'trigger'->>'columnId',a.trigger_col) AS effective_trigger_col,
          GREATEST(0, COALESCE(
            CASE WHEN a.definition->'trigger'->'config'->>'minutesBefore' ~ '^\\d+$'
              THEN (a.definition->'trigger'->'config'->>'minutesBefore')::int END,
            CASE WHEN a.action_config->>'minutesBefore' ~ '^\\d+$'
              THEN (a.action_config->>'minutesBefore')::int END,
            0)) AS minutes_before
        FROM automations a
        JOIN tables t ON t.id=a.table_id
        JOIN workspaces w ON w.id=t.workspace_id
        WHERE a.enabled=TRUE
          AND a.created_by IS NOT NULL
          AND COALESCE(a.definition->'trigger'->>'type',a.trigger_type) IN ('date_arrives','date_approaching','reminder')
          AND (
            w.owner_id::text=a.created_by::text
            OR EXISTS (SELECT 1 FROM workspace_members wm
              WHERE wm.workspace_id=w.id AND wm.user_id::text=a.created_by::text
                AND LOWER(COALESCE(wm.workspace_role,wm.role,'')) IN ('owner','admin','logistics_admin','editor','member'))
            OR EXISTS (SELECT 1 FROM board_member_access bma
              WHERE bma.table_id=t.id AND bma.user_id::text=a.created_by::text
                AND LOWER(COALESCE(bma.board_role,'')) IN ('owner','admin','editor','member'))
            OR EXISTS (SELECT 1 FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END
              ) member WHERE COALESCE(member->>'userId',member#>>'{}')=a.created_by::text
                AND LOWER(COALESCE(member->>'boardRole',member->>'permission',member->>'role','editor')) NOT IN ('read','viewer','comment','commenter'))
          )
      ), candidates AS (
        SELECT c.*, r.id AS row_id, r.values, r.values->>c.effective_trigger_col AS raw_value
        FROM configured c
        JOIN rows r ON r.table_id=c.table_id
        WHERE c.effective_trigger_col IS NOT NULL
          AND (c.task_ids IS NULL OR jsonb_array_length(c.task_ids)=0 OR c.task_ids @> jsonb_build_array(r.id::text))
          AND r.values->>c.effective_trigger_col IS NOT NULL
      ), scheduled AS (
        SELECT candidates.*,
          CASE
            WHEN raw_value ~ '^\\d{4}-\\d{2}-\\d{2}$' AND pg_input_is_valid(raw_value, 'date'::regtype)
              THEN raw_value::date::timestamptz - make_interval(mins=>minutes_before)
            WHEN raw_value ~ '^\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}' AND pg_input_is_valid(raw_value, 'timestamp with time zone'::regtype)
              THEN raw_value::timestamptz - make_interval(mins=>minutes_before)
            ELSE NULL
          END AS scheduled_at,
          raw_value ~ '^\\d{4}-\\d{2}-\\d{2}$' AS date_only
        FROM candidates
      )
      SELECT * FROM scheduled
      WHERE scheduled_at IS NOT NULL
        AND ((date_only AND scheduled_at::date=CURRENT_DATE)
          OR (NOT date_only AND scheduled_at<=NOW() AND scheduled_at>=NOW()-INTERVAL '5 minutes'))
    `);

    const triggered = [];
    for (const item of result.rows) {
      const definition = item.definition && Object.keys(item.definition).length ? automationBuilder.normalizeAutomationDefinition(item.definition) : null;
      const config = definition?.trigger?.config || (item.action_config && typeof item.action_config === "object" ? item.action_config : {});
      const rawValue = item.values?.[item.effective_trigger_col];
      const scheduled = new Date(item.scheduled_at);
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
          const plan = automationBuilder.buildExecutionPlan(definition, { type: item.effective_trigger_type, columnId: item.effective_trigger_col, newValues: item.values }, { currentUserId: item.created_by });
          if (!plan.matched) throw new Error("Automation conditions no longer match");
          for (const action of plan.actions) {
            const actionConfig = action.config || {};
            if (["send_email", "send_notification", "send_both"].includes(action.type)) {
              if (["send_email", "send_both"].includes(action.type)) await sendEmail({ to: actionConfig.recipients || recipients, subject, text: body });
              if (["send_notification", "send_both"].includes(action.type)) {
                const users = await pool.query("SELECT id FROM users WHERE LOWER(email)=ANY($1)", [(actionConfig.recipients || recipients).map((email) => String(email).toLowerCase())]);
                for (const recipient of users.rows) await pool.query("INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at) VALUES($1,$2,NULL,'automation',$3::jsonb,FALSE,NOW())", [randomUUID(), recipient.id, JSON.stringify({ title: subject, body, tableId: item.table_id, taskId: item.row_id })]);
              }
            } else if (["update_field", "assign_user"].includes(action.type)) await pool.query("UPDATE rows SET values=jsonb_set(COALESCE(values,'{}'::jsonb),$1,$2::jsonb,true),updated_at=NOW() WHERE id=$3 AND table_id=$4", [`{${action.columnId}}`, JSON.stringify(actionConfig.value ?? action.value ?? null), item.row_id, item.table_id]);
            else if (["create_row", "create_task"].includes(action.type)) await pool.query("INSERT INTO rows(id,table_id,values,created_by,created_at) VALUES($1,$2,$3::jsonb,$4,NOW())", [randomUUID(), actionConfig.tableId || item.table_id, JSON.stringify(actionConfig.values || { [titleColumn.id]: actionConfig.taskName || `Follow up: ${rowName}` }), item.created_by]);
            else if (action.type === "add_comment") await pool.query("INSERT INTO item_comments(id,row_id,user_id,body,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW())", [randomUUID(), item.row_id, item.created_by, String(actionConfig.body || action.value || "Automated reminder").slice(0,5000)]);
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
          await pool.query("INSERT INTO rows(id,table_id,values,created_by,created_at) VALUES($1,$2,$3,$4,NOW())", [randomUUID(), item.table_id, JSON.stringify({ [titleColumn.id]: String(config.taskName || `Follow up: ${rowName}`) }), item.created_by]);
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
    return NextResponse.json({ checked: result.rows.length, triggered, calendarReminders });
  } catch (error) {
    console.error("[AUTOMATION][DUE]", error);
    return NextResponse.json({ error: "Unable to process scheduled automations" }, { status: 500 });
  } finally {
    if (hasLock) await releaseSchedulerLock(lockToken).catch((error) => console.error("[AUTOMATION][LOCK_RELEASE]", error));
  }
}
