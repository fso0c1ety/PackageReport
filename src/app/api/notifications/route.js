import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `
        SELECT n.*, u.name as sender_name, u.avatar as sender_avatar
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.recipient_id = $1
        ORDER BY n.read ASC, n.created_at DESC
        LIMIT 50
      `,
      [user.id]
    );

    const notifications = await Promise.all(
      result.rows.map(async (notification) => {
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
