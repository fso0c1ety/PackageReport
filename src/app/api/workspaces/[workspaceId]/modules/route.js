import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { requireWritableSubscription } from "../../../_lib/billing";
import { inferWorkspaceModules, moduleStorageShape, normalizeWorkspaceModules, WORKSPACE_MODULES } from "../../../../../../server/services/moduleEngine";

export const runtime = "nodejs";
async function getModulesStorageShape() {
  const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_modules'");
  return moduleStorageShape(result.rows.map((row) => row.column_name));
}

async function inferModules(workspaceId) {
  const result = await pool.query("SELECT LOWER(name) AS name FROM tables WHERE workspace_id = $1", [workspaceId]);
  const names = result.rows.map((row) => row.name);
  return inferWorkspaceModules(names);
}

async function authorize(workspaceId, userId, ownerOnly = false) {
  const result = await pool.query("SELECT owner_id FROM workspaces WHERE id = $1", [workspaceId]);
  if (!result.rows[0]) return false;
  if (String(result.rows[0].owner_id) === String(userId)) return true;
  if (ownerOnly) return false;
  const shared = await pool.query(`SELECT 1 FROM tables WHERE workspace_id=$1 AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(shared_users,'[]'::jsonb)) member
    WHERE COALESCE(member->>'userId', member #>> '{}')=$2
  ) LIMIT 1`, [workspaceId, String(userId)]);
  return shared.rowCount > 0;
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;
  if (!(await authorize(workspaceId, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const shape = await getModulesStorageShape();
  const result = shape === "rows"
    ? await pool.query("SELECT module_key FROM workspace_modules WHERE workspace_id=$1 AND enabled=TRUE ORDER BY module_key", [workspaceId])
    : await pool.query("SELECT modules FROM workspace_modules WHERE workspace_id=$1", [workspaceId]);
  const stored = shape === "rows" ? result.rows.map((row) => row.module_key) : result.rows[0]?.modules;
  const modules = stored == null || result.rowCount === 0 ? await inferModules(workspaceId) : normalizeWorkspaceModules(stored);
  const owner = await pool.query("SELECT owner_id FROM workspaces WHERE id=$1", [workspaceId]);
  return NextResponse.json({ workspaceId, modules, available: WORKSPACE_MODULES, canManage: String(owner.rows[0]?.owner_id) === String(user.id) });
}

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;
  if (!(await authorize(workspaceId, user.id, true))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const billingError = await requireWritableSubscription(user.id, { workspaceId });
  if (billingError) return billingError;
  const body = await req.json();
  const modules = normalizeWorkspaceModules(body.modules);
  const shape = await getModulesStorageShape();
  if (shape === "rows") {
    await pool.query("UPDATE workspace_modules SET enabled=FALSE,updated_at=NOW() WHERE workspace_id=$1", [workspaceId]);
    for (const moduleKey of modules) await pool.query("INSERT INTO workspace_modules(workspace_id,module_key,enabled,settings,updated_at) VALUES($1,$2,TRUE,'{}'::jsonb,NOW()) ON CONFLICT(workspace_id,module_key) DO UPDATE SET enabled=TRUE,updated_at=NOW()", [workspaceId, moduleKey]);
  } else {
    await pool.query("INSERT INTO workspace_modules(workspace_id,modules,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(workspace_id) DO UPDATE SET modules=EXCLUDED.modules,updated_at=NOW()", [workspaceId, JSON.stringify(modules)]);
  }
  await pool.query("UPDATE workspaces SET ai_enabled=$1 WHERE id=$2", [modules.includes("ai"), workspaceId]);
  return NextResponse.json({ workspaceId, modules });
}
