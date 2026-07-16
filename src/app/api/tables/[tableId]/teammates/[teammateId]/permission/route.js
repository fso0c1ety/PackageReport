import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../../../_lib/server";
import { requireWritableSubscription } from "../../../../../_lib/billing";
import { writeAuditLog } from "../../../../../_lib/audit";

export const runtime = "nodejs";

const VALID_PERMISSIONS = new Set(["read", "edit", "admin"]);
const ROLE_PERMISSIONS = {
  admin: "admin",
  manager: "edit",
  employee: "edit",
  guest: "read",
};
const DEFAULT_CAPABILITIES = {
  admin: { editRows: true, comment: true, uploadFiles: true, export: true, manageColumns: true },
  manager: { editRows: true, comment: true, uploadFiles: true, export: true, manageColumns: true },
  employee: { editRows: true, comment: true, uploadFiles: true, export: false, manageColumns: false },
  guest: { editRows: false, comment: false, uploadFiles: false, export: false, manageColumns: false },
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
    const capabilities = role
      ? Object.fromEntries(
          Object.keys(DEFAULT_CAPABILITIES.admin).map((key) => [
            key,
            body.capabilities?.[key] ?? DEFAULT_CAPABILITIES[role][key],
          ])
        )
      : undefined;

    if (!VALID_PERMISSIONS.has(permission) || (role && !ROLE_PERMISSIONS[role])) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 400 });
    }

    const tableResult = await pool.query(
      `
        SELECT t.shared_users, t.workspace_id, t.name
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
        return entry === teammateId ? { userId: teammateId, permission, ...(role ? { role, capabilities } : {}) } : entry;
      }

      return entry?.userId === teammateId ? { ...entry, permission, ...(role ? { role, capabilities } : {}) } : entry;
    });

    await pool.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [
      JSON.stringify(nextSharedUsers),
      tableId,
    ]);

    await writeAuditLog({
      actorId: user.id,
      action: "member.role_changed",
      entityType: "member",
      entityId: teammateId,
      tableId,
      workspaceId: table.workspace_id,
      metadata: { role: role || null, permission, tableName: table.name },
    });

    return NextResponse.json({ success: true, permission, role: role || null, capabilities });
  } catch (err) {
    console.error("[TABLE TEAMMATE PERMISSION][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
