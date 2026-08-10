import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { hasPlatformPermission } from "../../../../../server/services/platformPermissions";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ platformStaff: false });
  const actor = (
    await pool.query(
      "SELECT role, permissions, active FROM platform_staff_roles WHERE user_id=$1 AND active=TRUE LIMIT 1",
      [String(user.id)]
    )
  ).rows[0];
  return NextResponse.json({
    platformStaff: Boolean(actor),
    role: actor?.role || null,
    canReadDemoRequests: hasPlatformPermission(actor, "demo_requests.read"),
    canManageDemoRequests: hasPlatformPermission(actor, "demo_requests.manage"),
    canProvisionDemos:
      hasPlatformPermission(actor, "demo_workspaces.create") &&
      hasPlatformPermission(actor, "demo_access.send"),
  });
}
