import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { listUserMemberships, normalizePortalType, PORTAL_ROUTES } from "../_lib/universalRoles";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const memberships = await listUserMemberships(pool, user.id);
    const requestedWorkspaceId = new URL(req.url).searchParams.get("workspaceId");
    const active = memberships.find((membership) => String(membership.workspaceId) === String(requestedWorkspaceId))
      || memberships.find((membership) => membership.portalType !== "standard")
      || memberships[0]
      || null;
    return NextResponse.json({ active, memberships });
  } catch (error) {
    console.error("[PORTAL CONTEXT][GET]", error);
    return NextResponse.json({ error: "Unable to resolve portal" }, { status: 500 });
  }
}

export async function PATCH(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const workspaceId = String(body.workspaceId || "");
  const portalType = normalizePortalType(body.portalType);
  const result = await pool.query(`
    UPDATE workspace_members
    SET portal_type=$3, landing_route=$4, updated_at=NOW()
    WHERE workspace_id=$1 AND user_id::text=$2::text
      AND (permitted_portals ? $3 OR portal_type=$3)
    RETURNING workspace_id
  `, [workspaceId, String(user.id), portalType, PORTAL_ROUTES[portalType]]);
  if (!result.rows[0]) return NextResponse.json({ error: "Portal is not assigned to this account" }, { status: 403 });
  const memberships = await listUserMemberships(pool, user.id);
  return NextResponse.json({ active: memberships.find((membership) => String(membership.workspaceId) === workspaceId) || null, memberships });
}
