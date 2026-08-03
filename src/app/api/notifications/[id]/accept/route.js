import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { requireWritableSubscription } from "../../../_lib/billing";
import { legacyPermissionForBoardRole, normalizeBoardRole, normalizeJobRoles, normalizePortalType, normalizeRecordAccess, normalizeWorkspaceRole, PORTAL_ROUTES } from "../../../_lib/universalRoles";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routeParams = await params;
  const notificationId = routeParams?.id;
  if (!notificationId) {
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
  }

  try {
    const notifResult = await pool.query(
      "SELECT * FROM notifications WHERE id = $1 AND recipient_id = $2",
      [notificationId, user.id]
    );
    const notification = notifResult.rows[0];

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    if (notification.type !== "invite") {
      return NextResponse.json({ error: "Not an invite" }, { status: 400 });
    }

    const { tableId } = notification.data || {};
    if (!tableId) {
      return NextResponse.json({ error: "Invalid invite data" }, { status: 400 });
    }

    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;

    const tableResult = await pool.query("SELECT * FROM tables WHERE id = $1", [tableId]);
    const table = tableResult.rows[0];
    if (!table) return NextResponse.json({ error: "Board no longer exists" }, { status: 404 });
    const data = notification.data || {};
    const boardRole = normalizeBoardRole(data.boardRole || data.role || data.permission);
    const permission = legacyPermissionForBoardRole(boardRole);
    const workspaceRole = normalizeWorkspaceRole(data.workspaceRole || "member");
    const jobRoles = normalizeJobRoles(data.jobRoles);
    const portalType = normalizePortalType(data.portalType || (jobRoles.includes("driver") ? "driver" : "standard"));
    const recordAccess = normalizeRecordAccess(data.recordAccess || { scope: "all_permitted" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const sharedUsers = (Array.isArray(table.shared_users) ? table.shared_users : []).filter((entry) => String(entry?.userId || entry) !== String(user.id));
      sharedUsers.push({ userId: String(user.id), permission, role: boardRole, boardRole });
      await client.query("UPDATE tables SET shared_users=$1::jsonb WHERE id=$2", [JSON.stringify(sharedUsers), tableId]);
      await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,job_roles,portal_type,landing_route,record_access,updated_at) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,NOW()) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role,workspace_role=EXCLUDED.workspace_role,job_roles=EXCLUDED.job_roles,portal_type=EXCLUDED.portal_type,landing_route=EXCLUDED.landing_route,record_access=EXCLUDED.record_access,updated_at=NOW()`, [table.workspace_id,String(user.id),jobRoles.includes("driver")?"driver":workspaceRole,workspaceRole,JSON.stringify(jobRoles),portalType,PORTAL_ROUTES[portalType],JSON.stringify(recordAccess)]);
      await client.query(`INSERT INTO board_member_access(table_id,user_id,board_role,capabilities,record_access,updated_at) VALUES($1,$2,$3,'{}'::jsonb,$4::jsonb,NOW()) ON CONFLICT(table_id,user_id) DO UPDATE SET board_role=EXCLUDED.board_role,record_access=EXCLUDED.record_access,updated_at=NOW()`, [tableId,String(user.id),boardRole,JSON.stringify(recordAccess)]);
      await client.query("DELETE FROM notifications WHERE id=$1", [notificationId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }

    return NextResponse.json({ success: true, message: "Invite accepted" });
  } catch (err) {
    console.error("[NOTIFICATIONS][ACCEPT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
