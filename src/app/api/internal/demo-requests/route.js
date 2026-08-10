import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { hasPlatformPermission } from "../../../../../server/services/platformPermissions";

async function actor(req) {
  const user = getAuthenticatedUser(req); if (!user?.id) return null;
  return (await pool.query("SELECT role,permissions,active FROM platform_staff_roles WHERE user_id=$1", [String(user.id)])).rows[0] || null;
}
export async function GET(req) {
  const staff = await actor(req); if (!hasPlatformPermission(staff, "demo_requests.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = (await pool.query("SELECT id,name,company_name,email,phone,business_type,team_size,recommended_template,status,assigned_to,created_at,updated_at FROM demo_requests ORDER BY created_at DESC LIMIT 250")).rows;
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
