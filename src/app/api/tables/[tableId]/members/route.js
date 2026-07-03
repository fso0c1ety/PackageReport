import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;

    const accessRes = await pool.query(
      `
        SELECT t.id, t.shared_users, w.owner_id
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.id = $1
          AND (
            w.owner_id = $2
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(t.shared_users) AS elem
              WHERE elem->>'userId' = $2
            )
          )
      `,
      [tableId, user.id]
    );

    if (accessRes.rows.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const table = accessRes.rows[0];
    const ownerId = table.owner_id;
    const sharedUsers = Array.isArray(table.shared_users)
      ? table.shared_users.map((entry) => entry?.userId).filter(Boolean)
      : [];

    const memberIds = [...new Set([ownerId, ...sharedUsers])];

    const usersRes = await pool.query(
      "SELECT id, name, email, avatar FROM users WHERE id = ANY($1)",
      [memberIds]
    );

    const members = usersRes.rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        avatar:
          row.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            row.name
          )}&background=random&color=fff&bold=true`,
        role: row.id === ownerId ? "owner" : "member",
      }))
      .sort((a, b) => {
        if (a.role === "owner") return -1;
        if (b.role === "owner") return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json(members);
  } catch (err) {
    console.error("[TABLE MEMBERS][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
