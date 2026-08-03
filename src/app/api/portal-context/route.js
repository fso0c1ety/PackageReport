import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { listUserMemberships } from "../_lib/universalRoles";

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
