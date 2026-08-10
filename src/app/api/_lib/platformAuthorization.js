import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "./server";
import { hasPlatformPermission } from "../../../../server/services/platformPermissions";

export { hasPlatformPermission };

export async function getPlatformActor(userId) {
  if (!userId) return null;
  const result = await pool.query(
    "SELECT user_id, role, permissions, active FROM platform_staff_roles WHERE user_id=$1 AND active=TRUE LIMIT 1",
    [String(userId)]
  );
  return result.rows[0] || null;
}

export async function requirePlatformPermission(req, permission) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null, actor: null };
  const actor = await getPlatformActor(user.id);
  if (!hasPlatformPermission(actor, permission)) {
    return { response: NextResponse.json({ error: "Platform staff access required" }, { status: 403 }), user, actor };
  }
  return { response: null, user, actor };
}
