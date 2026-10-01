import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { requireBoardPermission, requireRowPermission } from "../_lib/authorization";

export const runtime = "nodejs";

const diagnosticQuery = (route, text, values) => typeof pool.queryWithDiagnostics === "function"
  ? pool.queryWithDiagnostics(route, text, values)
  : pool.query(text, values);

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
    const prefResult = await diagnosticQuery("GET /api/notifications preferences", "SELECT notification_preferences FROM users WHERE id=$1", [user.id]);
    const categories = prefResult.rows[0]?.notification_preferences?.categories || {};
    const result = await diagnosticQuery("GET /api/notifications list",
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
      const pendingInvitations = await diagnosticQuery("GET /api/notifications invitations",
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
    const rowPermissionCache = new Map();
    const boardPermissionCache = new Map();
    const visibleRows = (await Promise.all(categoryRows.map(async (notification) => {
      const data = notification.data || {};
      if (notification.type === "invite" && data.invitationId) {
        if (pendingInvitationIds.has(String(data.invitationId))) return notification;
      }
      if (data.taskId && data.tableId) {
        const key = `${data.taskId}:${data.tableId}`;
        if (!rowPermissionCache.has(key)) rowPermissionCache.set(key, requireRowPermission(pool, user.id, data.taskId, "viewer", data.tableId));
        return await rowPermissionCache.get(key)
          ? notification
          : null;
      }
      if (data.tableId) {
        const key = String(data.tableId);
        if (!boardPermissionCache.has(key)) boardPermissionCache.set(key, requireBoardPermission(pool, user.id, data.tableId, "viewer"));
        return await boardPermissionCache.get(key)
          ? notification
          : null;
      }
      return notification;
    }))).filter(Boolean);
    const enrichmentTableIds = [...new Set(visibleRows
      .filter((notification) => !notification.data?.workspaceId && notification.data?.tableId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notification.data.tableId))
      .map((notification) => String(notification.data.tableId)))];
    const workspaceByTableId = new Map();
    if (enrichmentTableIds.length) {
      const tableRes = await diagnosticQuery("GET /api/notifications workspace enrichment", "SELECT id::text, workspace_id FROM tables WHERE id::text = ANY($1::text[])", [enrichmentTableIds]);
      for (const row of tableRes.rows) workspaceByTableId.set(String(row.id), row.workspace_id);
    }
    const notifications = await Promise.all(
      visibleRows.map(async (notification) => {
        const data = notification.data || {};

        if (!data.workspaceId && data.tableId) {
          try {
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.tableId)) {
              const workspaceId = workspaceByTableId.get(String(data.tableId));
              if (workspaceId) data.workspaceId = workspaceId;
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
