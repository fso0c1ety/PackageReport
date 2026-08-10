import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../../_lib/server";
import { writeAuditLog } from "../../../../_lib/audit";
import {
  BOARD_ROLES, PORTAL_ROUTES, PORTAL_TYPES, RECORD_ACCESS_SCOPES, WORKSPACE_ROLES,
  legacyPermissionForBoardRole, membershipFromRow, normalizeBoardRole,
  normalizeJobRoles, normalizePortalType, normalizeRecordAccess, normalizeWorkspaceRole,
} from "../../../../_lib/universalRoles";

export const runtime = "nodejs";

async function managementAccess(workspaceId, actorId) {
  const result = await pool.query(`
    SELECT w.id, w.owner_id,
      CASE WHEN w.owner_id::text=$2::text THEN 'owner' ELSE wm.workspace_role END AS actor_role,
      COALESCE(wm.allowed_actions,'[]'::jsonb) AS actor_allowed_actions
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
    WHERE w.id=$1 LIMIT 1
  `, [workspaceId, String(actorId)]);
  const row = result.rows[0];
  const role = normalizeWorkspaceRole(row?.actor_role, "");
  const actions = Array.isArray(row?.actor_allowed_actions) ? row.actor_allowed_actions : [];
  return row && (["owner", "admin"].includes(role) || (role === "manager" && actions.includes("manage_members"))) ? row : null;
}

async function loadMembership(workspaceId, userId) {
  const result = await pool.query(`
    SELECT w.id AS workspace_id, w.name AS workspace_name, w.template_key,
      (w.owner_id::text=$2::text) AS is_owner,
      wm.role, wm.workspace_role, wm.job_roles, wm.primary_job_role, wm.portal_type, wm.permitted_portals, wm.landing_route,
      wm.record_access, wm.navigation, wm.allowed_actions, wm.team_id,
      wm.department_id, wm.company_id
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
    WHERE w.id=$1 AND (w.owner_id::text=$2::text OR wm.user_id IS NOT NULL)
    LIMIT 1
  `, [workspaceId, String(userId)]);
  if (!result.rows[0]) return null;
  const membership = membershipFromRow(result.rows[0]);
  const boards = await pool.query(`
    SELECT t.id AS "tableId", t.name AS "tableName",
      COALESCE(bma.board_role,
        (SELECT CASE
          WHEN LOWER(COALESCE(member->>'role','')) IN ('admin','manager','owner') THEN 'owner'
          WHEN LOWER(COALESCE(member->>'permission',''))='edit' THEN 'editor'
          WHEN LOWER(COALESCE(member->>'role','')) IN ('client','commenter') THEN 'commenter'
          ELSE 'viewer' END
         FROM jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) member
         WHERE COALESCE(member->>'userId',member#>>'{}')=$2::text LIMIT 1)
      ) AS "boardRole",
      bma.capabilities, bma.record_access AS "recordAccess"
    FROM tables t
    LEFT JOIN board_member_access bma ON bma.table_id=t.id AND bma.user_id::text=$2::text
    WHERE t.workspace_id=$1 ORDER BY t.created_at, t.name
  `, [workspaceId, String(userId)]);
  return { ...membership, boardAccess: boards.rows.map((board) => ({ ...board, hasAccess: Boolean(board.boardRole) })) };
}

export async function GET(req, { params }) {
  const actor = getAuthenticatedUser(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId, userId } = await params;
  const isSelf = String(actor.id) === String(userId);
  if (!isSelf && !(await managementAccess(workspaceId, actor.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const membership = await loadMembership(workspaceId, userId);
  return membership
    ? NextResponse.json({ membership, options: { workspaceRoles: WORKSPACE_ROLES, boardRoles: BOARD_ROLES, portalTypes: PORTAL_TYPES, recordScopes: RECORD_ACCESS_SCOPES } })
    : NextResponse.json({ error: "Membership not found" }, { status: 404 });
}

export async function PUT(req, { params }) {
  const actor = getAuthenticatedUser(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId, userId } = await params;
  const access = await managementAccess(workspaceId, actor.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const targetIsOwner = String(access.owner_id) === String(userId);
  const workspaceRole = targetIsOwner ? "owner" : normalizeWorkspaceRole(body.workspaceRole);
  if (!WORKSPACE_ROLES.includes(workspaceRole) || (!targetIsOwner && workspaceRole === "owner" && String(actor.id) !== String(access.owner_id))) {
    return NextResponse.json({ error: "Only the current owner can transfer ownership" }, { status: 400 });
  }
  if (targetIsOwner && workspaceRole !== "owner") {
    return NextResponse.json({ error: "Transfer ownership before changing the owner role" }, { status: 400 });
  }

  const jobRoles = normalizeJobRoles(body.jobRoles);
  const primaryJobRole = jobRoles.includes(body.primaryJobRole) ? body.primaryJobRole : jobRoles[0] || null;
  const portalType = normalizePortalType(body.portalType);
  const permittedPortals = [...new Set([portalType, ...(Array.isArray(body.permittedPortals) ? body.permittedPortals.map(normalizePortalType) : [])])];
  const recordAccess = normalizeRecordAccess(body.recordAccess);
  const landingRoute = String(body.landingRoute || PORTAL_ROUTES[portalType]).slice(0, 255);
  const navigation = Array.isArray(body.navigation) ? body.navigation.map(String).slice(0, 50) : [];
  const allowedActions = Array.isArray(body.allowedActions) ? body.allowedActions.map(String).slice(0, 100) : [];
  const legacyRole = jobRoles.includes("driver") ? "driver" : workspaceRole;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO workspace_members(
        workspace_id,user_id,role,workspace_role,job_roles,primary_job_role,portal_type,permitted_portals,landing_route,
        record_access,navigation,allowed_actions,team_id,department_id,company_id,updated_at
      ) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,$15,NOW())
      ON CONFLICT(workspace_id,user_id) DO UPDATE SET
        role=EXCLUDED.role, workspace_role=EXCLUDED.workspace_role, job_roles=EXCLUDED.job_roles,
        primary_job_role=EXCLUDED.primary_job_role, portal_type=EXCLUDED.portal_type, permitted_portals=EXCLUDED.permitted_portals, landing_route=EXCLUDED.landing_route,
        record_access=EXCLUDED.record_access, navigation=EXCLUDED.navigation,
        allowed_actions=EXCLUDED.allowed_actions, team_id=EXCLUDED.team_id,
        department_id=EXCLUDED.department_id, company_id=EXCLUDED.company_id, updated_at=NOW()
    `, [workspaceId, String(userId), legacyRole, workspaceRole, JSON.stringify(jobRoles), primaryJobRole, portalType, JSON.stringify(permittedPortals), landingRoute,
      JSON.stringify(recordAccess), JSON.stringify(navigation), JSON.stringify(allowedActions),
      body.teamId || null, body.departmentId || null, body.companyId || null]);

    if (Array.isArray(body.boardAccess)) for (const requested of body.boardAccess) {
      const tableId = String(requested.tableId || "");
      const belongs = (await client.query("SELECT id,shared_users FROM tables WHERE id=$1 AND workspace_id=$2", [tableId, workspaceId])).rows[0];
      if (!belongs) throw new Error("Board does not belong to workspace");
      const existing = Array.isArray(belongs.shared_users) ? belongs.shared_users : [];
      const withoutUser = existing.filter((entry) => String(typeof entry === "string" ? entry : entry?.userId) !== String(userId));
      if (requested.hasAccess === false || !requested.boardRole) {
        await client.query("DELETE FROM board_member_access WHERE table_id=$1 AND user_id=$2", [tableId, String(userId)]);
        await client.query("UPDATE tables SET shared_users=$1::jsonb WHERE id=$2", [JSON.stringify(withoutUser), tableId]);
        continue;
      }
      const boardRole = normalizeBoardRole(requested.boardRole);
      const boardRecordAccess = requested.recordAccess ? normalizeRecordAccess(requested.recordAccess) : null;
      await client.query(`
        INSERT INTO board_member_access(table_id,user_id,board_role,capabilities,record_access,updated_at)
        VALUES($1,$2,$3,$4::jsonb,$5::jsonb,NOW())
        ON CONFLICT(table_id,user_id) DO UPDATE SET board_role=EXCLUDED.board_role,
          capabilities=EXCLUDED.capabilities,record_access=EXCLUDED.record_access,updated_at=NOW()
      `, [tableId, String(userId), boardRole, JSON.stringify(requested.capabilities || {}), boardRecordAccess ? JSON.stringify(boardRecordAccess) : null]);
      const compatibilityEntry = { userId: String(userId), permission: legacyPermissionForBoardRole(boardRole), boardRole, role: boardRole, capabilities: requested.capabilities || {} };
      await client.query("UPDATE tables SET shared_users=$1::jsonb WHERE id=$2", [JSON.stringify([...withoutUser, compatibilityEntry]), tableId]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[WORKSPACE MEMBER ACCESS][PUT]", error);
    return NextResponse.json({ error: error.message || "Unable to save access" }, { status: 400 });
  } finally {
    client.release();
  }

  await writeAuditLog({ actorId: actor.id, action: "member.access_updated", entityType: "member", entityId: userId, workspaceId, metadata: { workspaceRole, jobRoles, portalType, recordAccess } });
  return NextResponse.json({ success: true, membership: await loadMembership(workspaceId, userId) });
}
