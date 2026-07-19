import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { requireWritableSubscription } from "../../../_lib/billing";
import { randomUUID } from "crypto";
import { sendEmail } from "../../../_lib/mailer";
import { isSafePublicHttpsUrl } from "../../../_lib/security";

export const runtime = "nodejs";

async function authorizeTable(tableId, userId, write = false) {
  const result = await pool.query("SELECT t.shared_users,w.owner_id FROM tables t JOIN workspaces w ON w.id=t.workspace_id WHERE t.id=$1", [tableId]);
  const table = result.rows[0];
  if (!table) return false;
  if (String(table.owner_id) === String(userId)) return true;
  const member = (Array.isArray(table.shared_users) ? table.shared_users : []).find((entry) => String(typeof entry === "string" ? entry : entry?.userId) === String(userId));
  if (!member) return false;
  const permission = typeof member === "object" ? member.permission || member.role : "editor";
  return !write || !["viewer", "guest", "read"].includes(String(permission).toLowerCase());
}

async function getAutomationIdType() {
  const result = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='automations' AND column_name='id' LIMIT 1");
  return result.rows[0]?.data_type || "text";
}

async function executeRetryActions({ actions, automation, table, rowId, values, actorId }) {
  const results = [];
  for (const action of actions) {
    const config = action?.config && typeof action.config === "object" ? action.config : {};
    const columnId = action?.columnId || config.columnId;
    if (["send_email", "send_notification", "send_both"].includes(action.type)) {
      if (["send_email", "send_both"].includes(action.type)) {
        await sendEmail({ to: Array.isArray(config.recipients) ? config.recipients : automation.recipients || [], subject: `Automation: ${table.name}`, text: String(config.body || "An automation was triggered.") });
      }
      if (["send_notification", "send_both"].includes(action.type)) {
        const recipients = Array.isArray(config.recipients) ? config.recipients.map((email) => String(email).toLowerCase()) : [];
        const users = await pool.query("SELECT id FROM users WHERE LOWER(email)=ANY($1)", [recipients]);
        for (const recipient of users.rows) await pool.query("INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at) VALUES($1,$2,$3,'automation',$4::jsonb,FALSE,NOW())", [randomUUID(), recipient.id, actorId, JSON.stringify({ title: automation.name || "Automation", body: config.body || "An automation was triggered.", tableId: table.id, taskId: rowId })]);
      }
    } else if (["update_field", "assign_user"].includes(action.type)) {
      if (!columnId) throw new Error("Target column is required");
      await pool.query("UPDATE rows SET values=jsonb_set(COALESCE(values,'{}'::jsonb),$1,$2::jsonb,true),updated_at=NOW() WHERE id=$3 AND table_id=$4", [`{${columnId}}`, JSON.stringify(config.value ?? action.value ?? null), rowId, table.id]);
    } else if (["create_row", "create_task"].includes(action.type)) {
      const targetTableId = String(config.tableId || table.id);
      await pool.query("INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) VALUES($1,$2,$3::jsonb,$4,NOW(),NOW())", [randomUUID(), targetTableId, JSON.stringify(config.values || { task: config.taskName || `Follow up: ${rowId}` }), actorId]);
    } else if (action.type === "duplicate_row") {
      await pool.query("INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) SELECT $1,table_id,values,$2,NOW(),NOW() FROM rows WHERE id=$3 AND table_id=$4", [randomUUID(), actorId, rowId, table.id]);
    } else if (action.type === "move_row") {
      if (!config.tableId) throw new Error("Destination board is required");
      await pool.query("UPDATE rows SET table_id=$1,updated_at=NOW() WHERE id=$2 AND table_id=$3", [String(config.tableId), rowId, table.id]);
    } else if (action.type === "create_relation") {
      if (!columnId || !config.targetTableId || !config.targetRowId) throw new Error("Relation target is required");
      await pool.query("INSERT INTO row_relations(id,source_row_id,source_column_id,target_table_id,target_row_id,created_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(source_row_id,source_column_id,target_row_id) DO NOTHING", [randomUUID(), rowId, columnId, config.targetTableId, config.targetRowId, actorId]);
    } else if (action.type === "add_comment") {
      await pool.query("INSERT INTO item_comments(id,row_id,user_id,body,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW())", [randomUUID(), rowId, actorId, String(config.body || action.value || "Automated update").slice(0, 5000)]);
    } else if (action.type === "call_webhook") {
      if (!isSafePublicHttpsUrl(String(config.webhookUrl || ""))) throw new Error("Safe public HTTPS webhook URL required");
      const response = await fetch(config.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ automationId: automation.id, tableId: table.id, rowId, values }) });
      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    } else if (action.type === "archive_row") {
      await pool.query("UPDATE rows SET archived_at=NOW(),updated_at=NOW() WHERE id=$1 AND table_id=$2", [rowId, table.id]);
    } else throw new Error(`Unsupported retry action: ${action.type}`);
    results.push({ type: action.type, success: true });
  }
  return results;
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { tableId, id } = await params;
    if (!(await authorizeTable(tableId, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const automation = await pool.query("SELECT * FROM automations WHERE id=$1 AND table_id=$2", [id, tableId]);
    if (!automation.rows[0]) return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    const history = await pool.query("SELECT * FROM automation_runs WHERE automation_id=$1 ORDER BY created_at DESC LIMIT 100", [String(id)]);
    return NextResponse.json({ automation: automation.rows[0], history: history.rows });
  } catch (err) {
    console.error("[AUTOMATION/:tableId/:id][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { tableId, id } = await params;
    if (!(await authorizeTable(tableId, user.id, true))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;
    const body = await req.json();
    const operation = String(body?.operation || "set_enabled");
    if (operation === "set_enabled") {
      const result = await pool.query("UPDATE automations SET enabled=$1,definition=jsonb_set(COALESCE(definition,'{}'::jsonb),'{enabled}',to_jsonb($1::boolean),true),updated_at=NOW() WHERE id=$2 AND table_id=$3 RETURNING *", [Boolean(body.enabled), id, tableId]);
      if (!result.rows[0]) return NextResponse.json({ error: "Automation not found" }, { status: 404 });
      return NextResponse.json({ automation: result.rows[0] });
    }
    if (operation === "duplicate") {
      const source = await pool.query("SELECT * FROM automations WHERE id=$1 AND table_id=$2", [id, tableId]);
      const row = source.rows[0];
      if (!row) return NextResponse.json({ error: "Automation not found" }, { status: 404 });
      const columns = ["table_id","task_id","task_ids","trigger_col","enabled","recipients","cols","action_type","trigger_type","action_config","conditions","actions","created_by","name","definition","version"];
      const values = columns.map((column) => column === "name" ? `${row.name || "Automation"} copy` : column === "definition" ? { ...(row.definition || {}), name: `${row.name || "Automation"} copy` } : row[column]);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(",");
      const idType = await getAutomationIdType();
      const result = ["smallint", "integer", "bigint"].includes(idType)
        ? await pool.query(`INSERT INTO automations(${columns.join(",")}) VALUES(${placeholders}) RETURNING *`, values)
        : await pool.query(`INSERT INTO automations(id,${columns.join(",")}) VALUES($1,${values.map((_, index) => `$${index + 2}`).join(",")}) RETURNING *`, [randomUUID(), ...values]);
      return NextResponse.json({ automation: result.rows[0] }, { status: 201 });
    }
    if (operation === "retry") {
      const result = await pool.query(`UPDATE automation_runs SET status='running',error_message=NULL,attempt=attempt+1,started_at=NOW(),finished_at=NULL WHERE id=$1 AND automation_id=$2 AND status='failed' AND attempt<max_attempts RETURNING *`, [body.runId, String(id)]);
      if (!result.rows[0]) return NextResponse.json({ error: "Run is not retryable" }, { status: 409 });
      const run = result.rows[0];
      try {
        const automationResult = await pool.query("SELECT * FROM automations WHERE id=$1 AND table_id=$2", [id, tableId]);
        const tableResult = await pool.query("SELECT * FROM tables WHERE id=$1", [tableId]);
        const rowResult = await pool.query("SELECT * FROM rows WHERE id=$1 AND table_id=$2", [run.row_id, tableId]);
        if (!automationResult.rows[0] || !tableResult.rows[0] || !rowResult.rows[0]) throw new Error("Automation retry context is no longer available");
        const actions = Array.isArray(run.actions) ? run.actions : [];
        const values = run.input?.newValues || rowResult.rows[0].values || {};
        const output = await executeRetryActions({ actions, automation: automationResult.rows[0], table: tableResult.rows[0], rowId: run.row_id, values, actorId: user.id });
        const completed = await pool.query("UPDATE automation_runs SET status='success',output=$1::jsonb,finished_at=NOW() WHERE id=$2 RETURNING *", [JSON.stringify({ retry: true, results: output }), run.id]);
        await pool.query("UPDATE automations SET last_run_at=NOW(),run_count=COALESCE(run_count,0)+1 WHERE id=$1", [id]);
        return NextResponse.json({ run: completed.rows[0], retried: true });
      } catch (retryError) {
        const failed = await pool.query("UPDATE automation_runs SET status='failed',error_message=$1,finished_at=NOW() WHERE id=$2 RETURNING *", [retryError.message || String(retryError), run.id]);
        await pool.query("UPDATE automations SET last_run_at=NOW(),run_count=COALESCE(run_count,0)+1,failure_count=COALESCE(failure_count,0)+1 WHERE id=$1", [id]);
        return NextResponse.json({ error: retryError.message || "Retry failed", run: failed.rows[0] }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "Unsupported operation" }, { status: 400 });
  } catch (err) {
    console.error("[AUTOMATION/:tableId/:id][PATCH] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId, id } = await params;
    if (!(await authorizeTable(tableId, user.id, true))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;
    await pool.query("DELETE FROM automations WHERE id = $1 AND table_id = $2", [id, tableId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AUTOMATION/:tableId/:id][DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
