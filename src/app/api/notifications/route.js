import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { requireBoardPermission, requireRowPermission } from "../_lib/authorization";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const typeFilter = String(url.searchParams.get("type") || "").trim();
    const workspaceFilter = String(url.searchParams.get("workspaceId") || "").trim();
    const unreadOnly = url.searchParams.get("unread") === "true";
    const prefResult = await pool.query("SELECT notification_preferences FROM users WHERE id=$1", [user.id]);
    const categories = prefResult.rows[0]?.notification_preferences?.categories || {};
    const result = await pool.query(
      `
        SELECT n.*, u.name as sender_name, u.avatar as sender_avatar
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.recipient_id = $1
          AND ($2 = '' OR n.type = $2)
          AND ($3 = '' OR n.data->>'workspaceId' = $3 OR EXISTS (
            SELECT 1 FROM tables filter_table WHERE filter_table.id = n.data->>'tableId' AND filter_table.workspace_id = $3
          ))
          AND (NOT $4::boolean OR n.read = FALSE)
        ORDER BY n.read ASC, n.created_at DESC
        LIMIT 50
      `,
      [user.id, typeFilter, workspaceFilter, unreadOnly]
    );

    const categoryFor = (type) => type === "security" || type === "login" ? "security" : type === "comment" || type === "chat" ? "comments" : type === "deadline" || type === "calendar" ? "deadlines" : type === "billing" ? "billing" : "assignments";
    const categoryRows = result.rows.filter((notification) => categories[categoryFor(notification.type)] !== false);
    // Professional invites were added after v1.0.1. Resolve all pending IDs in
    // one lookup rather than adding one database query per bell item.
    const inviteIds = [...new Set(categoryRows
      .filter((notification) => notification.type === "invite" && notification.data?.invitationId)
      .map((notification) => String(notification.data.invitationId)))];
    const pendingInvitationIds = new Set();
    if (inviteIds.length) {
      const pendingInvitations = await pool.query(
        `SELECT id::text AS id FROM professional_invitations
         WHERE recipient_id=$1 AND status='pending' AND id::text = ANY($2::text[])`,
        [String(user.id), inviteIds]
      );
      for (const invitation of pendingInvitations.rows) pendingInvitationIds.add(String(invitation.id));
    }
    // Permission checks are independent per notification. Running them in
    // parallel avoids a serial N+1 waterfall that can delay realtime-driven
    // refreshes when the user has many notifications, while preserving the
    // same row/board authorization check for every item.
    const visibleRows = (await Promise.all(categoryRows.map(async (notification) => {
      const data = notification.data || {};
      if (notification.type === "invite" && data.invitationId) {
        if (pendingInvitationIds.has(String(data.invitationId))) return notification;
      }
      if (data.taskId && data.tableId) {
        return await requireRowPermission(pool, user.id, data.taskId, "viewer", data.tableId)
          ? notification
          : null;
      }
      if (data.tableId) {
        return await requireBoardPermission(pool, user.id, data.tableId, "viewer")
          ? notification
          : null;
      }
      return notification;
    }))).filter(Boolean);
    const notifications = await Promise.all(
      visibleRows.map(async (notification) => {
        const data = notification.data || {};

        if (!data.workspaceId && data.tableId) {
          try {
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.tableId)) {
              const tableRes = await pool.query("SELECT workspace_id FROM tables WHERE id = $1", [
                data.tableId,
              ]);
              if (tableRes.rows[0]) {
                data.workspaceId = tableRes.rows[0].workspace_id;
              }
            }
          } catch {
            // Ignore enrichment issues and return the base notification payload.
          }
        }

        return { ...notification, data };
      })
    );

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("[NOTIFICATIONS][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
