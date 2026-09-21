import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { requireWritableSubscription } from "../../../_lib/billing";
import { inferWorkspaceModules, moduleStorageShape, normalizeWorkspaceModules, WORKSPACE_MODULES } from "../../../../../../server/services/moduleEngine";

export const runtime = "nodejs";

function perfResponse(payload, timings, enabled, requestId) {
  const response = NextResponse.json(payload);
  if (enabled) {
    response.headers.set("Server-Timing", Object.entries(timings).map(([name, value]) => `${name};dur=${Math.max(0, Math.round(value))}`).join(", "));
    response.headers.set("X-SM-Perf-Request-Id", requestId);
  }
  return response;
}

let modulesStorageShapePromise;

async function getModulesStorageShape() {
  if (!modulesStorageShapePromise) {
    modulesStorageShapePromise = pool
      .query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_modules'")
      .then((result) => moduleStorageShape(result.rows.map((row) => row.column_name)))
      .catch((error) => {
        modulesStorageShapePromise = undefined;
        throw error;
      });
  }
  return modulesStorageShapePromise;
}

async function inferModules(workspaceId) {
  const result = await pool.query("SELECT LOWER(name) AS name FROM tables WHERE workspace_id = $1", [workspaceId]);
  const names = result.rows.map((row) => row.name);
  return inferWorkspaceModules(names);
}

async function authorize(workspaceId, userId, ownerOnly = false) {
  const result = await pool.query("SELECT owner_id FROM workspaces WHERE id = $1", [workspaceId]);
  if (!result.rows[0]) return { authorized: false, isOwner: false };
  const isOwner = String(result.rows[0].owner_id) === String(userId);
  if (isOwner) return { authorized: true, isOwner: true };
  if (ownerOnly) return { authorized: false, isOwner: false };
  const shared = await pool.query("SELECT 1 FROM tables WHERE workspace_id=$1 AND COALESCE(shared_users,'[]'::jsonb) @> $2::jsonb LIMIT 1", [workspaceId, JSON.stringify([{ userId: String(userId) }])]);
  return { authorized: shared.rowCount > 0, isOwner: false };
}

export async function GET(req, { params }) {
  const enabled = req.nextUrl.searchParams.get("smperf") === "1";
  const requestId = enabled ? crypto.randomUUID() : "";
  const startedAt = performance.now();
  const user = getAuthenticatedUser(req);
  if (!user?.id) return perfResponse({ error: "Unauthorized" }, { total: performance.now() - startedAt }, enabled, requestId);
  const { workspaceId } = await params;
  const authStartedAt = performance.now();
  const authorization = await authorize(workspaceId, user.id);
  const authMs = performance.now() - authStartedAt;
  if (!authorization.authorized) return perfResponse({ error: "Forbidden" }, { auth: authMs, total: performance.now() - startedAt }, enabled, requestId);
  const shapeStartedAt = performance.now();
  const shape = await getModulesStorageShape();
  const shapeMs = performance.now() - shapeStartedAt;
  const queryStartedAt = performance.now();
  const result = shape === "rows"
    ? await pool.query("SELECT module_key FROM workspace_modules WHERE workspace_id=$1 AND enabled=TRUE ORDER BY module_key", [workspaceId])
    : await pool.query("SELECT modules FROM workspace_modules WHERE workspace_id=$1", [workspaceId]);
  const stored = shape === "rows" ? result.rows.map((row) => row.module_key) : result.rows[0]?.modules;
  const queryMs = performance.now() - queryStartedAt;
  const inferStartedAt = performance.now();
  const modules = stored == null || result.rowCount === 0 ? await inferModules(workspaceId) : normalizeWorkspaceModules(stored);
  const inferMs = performance.now() - inferStartedAt;
  return perfResponse({ workspaceId, modules, available: WORKSPACE_MODULES, canManage: authorization.isOwner }, { auth: authMs, shape: shapeMs, sql: queryMs, infer: inferMs, total: performance.now() - startedAt }, enabled, requestId);
}

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;
  const authorization = await authorize(workspaceId, user.id, true);
  if (!authorization.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
