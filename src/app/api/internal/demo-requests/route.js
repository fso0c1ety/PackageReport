import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { hasPlatformPermission } from "../../../../../server/services/platformPermissions";
import { provisionDemoRequest, recordDemoEvent, resetDemoWorkspace, sendDemoAccessEmail } from "../../_lib/demoProvisioning";

async function actor(req) {
  const user = getAuthenticatedUser(req); if (!user?.id) return null;
  const staff = (await pool.query("SELECT role,permissions,active FROM platform_staff_roles WHERE user_id=$1", [String(user.id)])).rows[0] || null;
  return staff ? { ...staff, userId: String(user.id) } : null;
}
export async function GET(req) {
  const staff = await actor(req); if (!hasPlatformPermission(staff, "demo_requests.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = (await pool.query(`SELECT dr.*,w.name workspace_name,w.created_at workspace_created_at,w.demo_expires_at,w.demo_metadata,u.email prospect_email
    FROM demo_requests dr LEFT JOIN workspaces w ON w.id=dr.demo_workspace_id LEFT JOIN users u ON u.id=dr.prospect_user_id
    ORDER BY dr.created_at DESC LIMIT 250`)).rows;
  return NextResponse.json({ requests: rows });
}
export async function PATCH(req) {
  const staff = await actor(req); if (!hasPlatformPermission(staff, "demo_requests.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({})); const id = String(body.id || "");
  const statuses = new Set(["new", "contacted", "qualified", "demo_preparing", "demo_ready", "demo_sent", "demo_completed", "converted", "not_interested"]);
  if (!id || !statuses.has(String(body.status || ""))) return NextResponse.json({ error: "Valid request and status are required" }, { status: 400 });
  const row = (await pool.query("UPDATE demo_requests SET status=$1,internal_notes=COALESCE($2,internal_notes),assigned_to=$3,updated_at=NOW() WHERE id=$4 RETURNING *", [body.status, body.internalNotes == null ? null : String(body.internalNotes).slice(0, 5000), body.assignedTo || null, id])).rows[0];
  return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req) {
  const staff = await actor(req); if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({})); const id = String(body.id || ""); const action = String(body.action || "provision");
  if (!id) return NextResponse.json({ error: "Request id is required" }, { status: 400 });
  try {
    if (action === "provision") {
      if (!hasPlatformPermission(staff, "demo_workspaces.create") || !hasPlatformPermission(staff, "demo_access.send")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const result = await provisionDemoRequest({ pool, req, requestId: id, actorId: staff.userId, templateKey: body.templateKey, durationDays: body.durationDays, workspaceName: body.workspaceName });
      return NextResponse.json(result, { status: result.access_email_status === "failed" ? 202 : 201 });
    }
    if (!hasPlatformPermission(staff, "demo_requests.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (action === "resend") {
      if (!hasPlatformPermission(staff, "demo_access.send")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const request = (await pool.query(`SELECT dr.*,w.name workspace_name,w.demo_expires_at,u.password user_password FROM demo_requests dr JOIN workspaces w ON w.id=dr.demo_workspace_id JOIN users u ON u.id=dr.prospect_user_id WHERE dr.id=$1`, [id])).rows[0];
      if (!request) return NextResponse.json({ error: "Provisioned demo not found" }, { status: 404 });
      await sendDemoAccessEmail({ pool, req, request, eventType: "access_resent", actorId: staff.userId }); return NextResponse.json({ success: true });
    }
    if (action === "extend") {
      const days = Math.max(1, Math.min(90, Number(body.days) || 7));
      const row = (await pool.query(`UPDATE workspaces w SET demo_expires_at=GREATEST(COALESCE(w.demo_expires_at,NOW()),NOW())+($2||' days')::interval,
        demo_metadata=(COALESCE(w.demo_metadata,'{}'::jsonb)-'revoked') FROM demo_requests dr WHERE dr.id=$1 AND dr.demo_workspace_id=w.id AND w.is_demo=TRUE RETURNING w.id,w.demo_expires_at`, [id, days])).rows[0];
      if (row) { await pool.query("UPDATE demo_requests SET revoked_at=NULL,status=CASE WHEN access_email_status='sent' THEN 'demo_sent' ELSE 'demo_ready' END,updated_at=NOW() WHERE id=$1", [id]); await recordDemoEvent(pool, id, staff.userId, "demo_extended", { days, expiresAt: row.demo_expires_at }); }
      return row ? NextResponse.json(row) : NextResponse.json({ error: "Demo not found" }, { status: 404 });
    }
    if (action === "revoke") {
      const row = (await pool.query(`UPDATE demo_requests dr SET revoked_at=NOW(),updated_at=NOW() FROM workspaces w
        WHERE dr.id=$1 AND w.id=dr.demo_workspace_id AND w.is_demo=TRUE RETURNING dr.id`, [id])).rows[0];
      if (row) await pool.query("UPDATE workspaces SET demo_expires_at=NOW(),demo_metadata=demo_metadata||'{\"revoked\":true}'::jsonb WHERE demo_request_id=$1 AND is_demo=TRUE", [id]);
      if (row) await recordDemoEvent(pool, id, staff.userId, "demo_revoked");
      return row ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Demo not found" }, { status: 404 });
    }
    if (action === "converted") {
      const row = (await pool.query("UPDATE demo_requests SET status='converted',conversion_started_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *", [id])).rows[0];
      if (row) await recordDemoEvent(pool, id, staff.userId, "demo_converted");
      return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (action === "reset") return NextResponse.json(await resetDemoWorkspace({ pool, requestId: id, actorId: staff.userId }));
    if (action === "delete") {
      const request = (await pool.query("SELECT company_name,demo_workspace_id FROM demo_requests WHERE id=$1", [id])).rows[0];
      if (!request?.demo_workspace_id) return NextResponse.json({ error: "Demo not found" }, { status: 404 });
      if (String(body.confirmDelete || "") !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm" }, { status: 400 });
      const protectedDemo = (await pool.query("SELECT id FROM workspaces WHERE id=$1 AND is_demo=TRUE AND demo_request_id=$2", [request.demo_workspace_id, id])).rows[0];
      if (!protectedDemo) return NextResponse.json({ error: "Deletion refused: target is not the linked demo workspace" }, { status: 409 });
      await recordDemoEvent(pool, id, staff.userId, "demo_deleted", { workspaceId: request.demo_workspace_id });
      await pool.query("UPDATE workspaces SET demo_expires_at=NOW()+INTERVAL '1 day',demo_metadata=demo_metadata-'revoked' WHERE id=$1 AND is_demo=TRUE AND demo_request_id=$2", [request.demo_workspace_id, id]);
      await pool.query("DELETE FROM workspaces WHERE id=$1 AND is_demo=TRUE AND demo_request_id=$2", [request.demo_workspace_id, id]);
      await pool.query("UPDATE demo_requests SET status='qualified',demo_workspace_id=NULL,prospect_user_id=NULL,access_email_status='not_sent',revoked_at=NULL,updated_at=NOW() WHERE id=$1", [id]);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("demo_request_provisioning_failed", { id, action, error: error.message });
    return NextResponse.json({ error: error.message || "Demo provisioning failed" }, { status: error.status || 500 });
  }
}
