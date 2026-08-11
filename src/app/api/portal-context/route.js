import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { listUserMemberships, normalizePortalType, PORTAL_ROUTES, selectPortalMembership } from "../_lib/universalRoles";
import { resolvePortalConfig } from "../../../portal-engine/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const memberships = await listUserMemberships(pool, user.id);
    const searchParams = new URL(req.url).searchParams;
    const requestedWorkspaceId = searchParams.get("workspaceId");
    const requestedPortalType = searchParams.get("portalType");
    const active = selectPortalMembership(memberships, {
      workspaceId: requestedWorkspaceId,
      portalType: requestedPortalType,
    });
    if ((requestedWorkspaceId || requestedPortalType) && !active) {
      return NextResponse.json({ error: "Portal is not assigned to this account" }, { status: 403 });
    }
    const withConfig = (membership) => membership ? { ...membership, portalConfig: resolvePortalConfig(membership) } : null;
    return NextResponse.json({ active: withConfig(active), memberships: memberships.map(withConfig) });
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
  const withConfig = (membership) => membership ? { ...membership, portalConfig: resolvePortalConfig(membership) } : null;
  return NextResponse.json({ active: withConfig(memberships.find((membership) => String(membership.workspaceId) === workspaceId) || null), memberships: memberships.map(withConfig) });
}
