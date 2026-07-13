import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../../../_lib/server";
import { requireWritableSubscription } from "../../../../../_lib/billing";

export const runtime = "nodejs";

const VALID_PERMISSIONS = new Set(["read", "edit", "admin"]);
const ROLE_PERMISSIONS = {
  admin: "admin",
  manager: "edit",
  employee: "edit",
  guest: "read",
};

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId, teammateId } = await params;
    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;
    const body = await req.json();
    const role = body?.role;
    const permission = role ? ROLE_PERMISSIONS[role] : body?.permission;

    if (!VALID_PERMISSIONS.has(permission) || (role && !ROLE_PERMISSIONS[role])) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 400 });
    }

    const tableResult = await pool.query(
      `
        SELECT t.shared_users
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.id = $1 AND w.owner_id = $2
        LIMIT 1
      `,
      [tableId, user.id]
    );

    const table = tableResult.rows[0];
    if (!table) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sharedUsers = Array.isArray(table.shared_users) ? table.shared_users : [];
    const nextSharedUsers = sharedUsers.map((entry) => {
      if (typeof entry === "string") {
        return entry === teammateId ? { userId: teammateId, permission, ...(role ? { role } : {}) } : entry;
      }

      return entry?.userId === teammateId ? { ...entry, permission, ...(role ? { role } : {}) } : entry;
    });

    await pool.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [
      JSON.stringify(nextSharedUsers),
      tableId,
    ]);

    return NextResponse.json({ success: true, permission, role: role || null });
  } catch (err) {
    console.error("[TABLE TEAMMATE PERMISSION][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
