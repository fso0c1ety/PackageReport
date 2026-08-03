import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { normalizePortalType, normalizeRecordAccess, normalizeWorkspaceRole } from "../../../_lib/universalRoles";

export const runtime = "nodejs";

async function canManage(workspaceId, userId) {
  const result = await pool.query(`SELECT 1 FROM workspaces w LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text WHERE w.id=$1 AND (w.owner_id::text=$2::text OR wm.workspace_role='admin' OR (wm.workspace_role='manager' AND COALESCE(wm.allowed_actions,'[]'::jsonb) ? 'manage_job_roles'))`, [workspaceId, String(userId)]);
  return Boolean(result.rows[0]);
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;
  const result = await pool.query(`SELECT id,key,name,enabled,is_system AS "isSystem",default_workspace_role AS "defaultWorkspaceRole",default_portal_type AS "defaultPortalType",default_landing_route AS "defaultLandingRoute",record_access_preset AS "recordAccessPreset",navigation,allowed_actions AS "allowedActions" FROM workspace_job_roles WHERE workspace_id=$1 ORDER BY is_system DESC,name`, [workspaceId]);
  return NextResponse.json(result.rows);
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;
  if (!(await canManage(workspaceId, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const name = String(body.name || "").trim().slice(0, 80);
  const key = String(body.key || name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  if (!name || !key) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const result = await pool.query(`INSERT INTO workspace_job_roles(id,workspace_id,key,name,enabled,is_system,default_workspace_role,default_portal_type,default_landing_route,record_access_preset,navigation,allowed_actions) VALUES($1,$2,$3,$4,$5,FALSE,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb) ON CONFLICT(workspace_id,key) DO UPDATE SET name=EXCLUDED.name,enabled=EXCLUDED.enabled,default_workspace_role=EXCLUDED.default_workspace_role,default_portal_type=EXCLUDED.default_portal_type,default_landing_route=EXCLUDED.default_landing_route,record_access_preset=EXCLUDED.record_access_preset,navigation=EXCLUDED.navigation,allowed_actions=EXCLUDED.allowed_actions,updated_at=NOW() RETURNING *`, [uuidv4(),workspaceId,key,name,body.enabled!==false,normalizeWorkspaceRole(body.defaultWorkspaceRole),normalizePortalType(body.defaultPortalType),body.defaultLandingRoute||null,JSON.stringify(normalizeRecordAccess(body.recordAccessPreset)),JSON.stringify(Array.isArray(body.navigation)?body.navigation:[]),JSON.stringify(Array.isArray(body.allowedActions)?body.allowedActions:[])]);
  return NextResponse.json(result.rows[0], { status: 201 });
}
