import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { requireWritableSubscription } from "../../../_lib/billing";

export const runtime = "nodejs";
const ALL_MODULES = ["crm", "finance", "calendar", "inventory", "hr", "fleet", "logistics", "ai", "reports", "documents", "settings"];

async function ensureModulesTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS workspace_modules (workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE, modules JSONB NOT NULL DEFAULT '[]'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

async function inferModules(workspaceId) {
  const result = await pool.query("SELECT LOWER(name) AS name FROM tables WHERE workspace_id = $1", [workspaceId]);
  const names = result.rows.map((row) => row.name);
  const modules = new Set(["calendar", "ai", "settings"]);
  if (names.some((name) => /clients|contacts|companies|deals/.test(name))) modules.add("crm");
  if (names.some((name) => /invoice|expense|fuel|report/.test(name))) modules.add("finance");
  if (names.some((name) => /product|inventory|material/.test(name))) modules.add("inventory");
  if (names.some((name) => /employee|leave|driver/.test(name))) modules.add("hr");
  if (names.some((name) => /truck|driver|trip|maintenance|fuel/.test(name))) modules.add("fleet");
  if (names.some((name) => /load|carrier|truck|trip|fleet/.test(name))) modules.add("logistics");
  if (names.some((name) => /report/.test(name))) modules.add("reports");
  if (names.some((name) => /document|file/.test(name))) modules.add("documents");
  return [...modules];
}

async function authorize(workspaceId, userId, ownerOnly = false) {
  const result = await pool.query("SELECT owner_id FROM workspaces WHERE id = $1", [workspaceId]);
  if (!result.rows[0]) return false;
  if (String(result.rows[0].owner_id) === String(userId)) return true;
  if (ownerOnly) return false;
  const shared = await pool.query("SELECT 1 FROM tables WHERE workspace_id=$1 AND COALESCE(shared_users,'[]'::jsonb) @> $2::jsonb LIMIT 1", [workspaceId, JSON.stringify([{ userId: String(userId) }])]);
  return shared.rowCount > 0;
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;
  if (!(await authorize(workspaceId, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await ensureModulesTable();
  const result = await pool.query("SELECT modules FROM workspace_modules WHERE workspace_id=$1", [workspaceId]);
  const modules = result.rows[0]?.modules || await inferModules(workspaceId);
  return NextResponse.json({ workspaceId, modules, available: ALL_MODULES });
}

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;
  if (!(await authorize(workspaceId, user.id, true))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const billingError = await requireWritableSubscription(user.id, { workspaceId });
  if (billingError) return billingError;
  const body = await req.json();
  const modules = [...new Set((Array.isArray(body.modules) ? body.modules : []).filter((module) => ALL_MODULES.includes(module)))];
  await ensureModulesTable();
  await pool.query("INSERT INTO workspace_modules(workspace_id,modules,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(workspace_id) DO UPDATE SET modules=EXCLUDED.modules,updated_at=NOW()", [workspaceId, JSON.stringify(modules)]);
  return NextResponse.json({ workspaceId, modules });
}
