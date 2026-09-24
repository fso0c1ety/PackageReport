import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { requireWritableSubscription } from "../../_lib/billing";

export const runtime = "nodejs";

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routeParams = await params;
  const teammateId = routeParams?.teammateId;
  if (!teammateId) {
    return NextResponse.json({ error: "Missing teammateId" }, { status: 400 });
  }

  const billingError = await requireWritableSubscription(user.id);
  if (billingError) return billingError;

  try {
    const pendingInvites = await pool.query(
      `DELETE FROM professional_invitations
       WHERE inviter_id=$1 AND recipient_id=$2 AND status='pending'
       RETURNING notification_id`,
      [String(user.id), String(teammateId)]
    );
    const notificationIds = pendingInvites.rows.map((row) => row.notification_id).filter(Boolean);
    if (notificationIds.length > 0) {
      await pool.query("DELETE FROM notifications WHERE id = ANY($1::text[])", [notificationIds]);
    }

    const ownedTablesRes = await pool.query(
      `
        SELECT t.id, t.shared_users
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE w.owner_id = $1
      `,
      [user.id]
    );

    for (const table of ownedTablesRes.rows) {
      if (table.shared_users && Array.isArray(table.shared_users)) {
        const newSharedUsers = table.shared_users.filter((u) => u.userId !== teammateId);
        if (newSharedUsers.length !== table.shared_users.length) {
          await pool.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [
            JSON.stringify(newSharedUsers),
            table.id,
          ]);
        }
      }
    }

    await pool.query(
      "DELETE FROM notifications WHERE sender_id = $1 AND recipient_id = $2 AND type = 'invite'",
      [user.id, teammateId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[TEAMMATES][DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
