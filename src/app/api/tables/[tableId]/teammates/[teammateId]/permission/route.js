import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../../../_lib/server";
import { requireWritableSubscription } from "../../../../../_lib/billing";
import { writeAuditLog } from "../../../../../_lib/audit";
import { ENTERPRISE_ROLES, normalizeEnterpriseRole } from "../../../../../_lib/permissions";

export const runtime = "nodejs";

const VALID_PERMISSIONS = new Set(["read", "edit", "admin"]);

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
    const hasAccess = body?.hasAccess !== false;
    const role = body?.role;
    const normalizedRole = role ? normalizeEnterpriseRole(role, body.capabilities) : null;
    const permission = normalizedRole?.permission || body?.permission;
    const capabilities = normalizedRole?.capabilities;

    if (hasAccess && (!VALID_PERMISSIONS.has(permission) || (role && !ENTERPRISE_ROLES[role]) || role === "owner")) {
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
    const existingEntry = sharedUsers.find((entry) =>
      String(typeof entry === "string" ? entry : entry?.userId) === String(teammateId)
    );
    let nextSharedUsers;
    if (!hasAccess) {
      nextSharedUsers = sharedUsers.filter((entry) =>
        String(typeof entry === "string" ? entry : entry?.userId) !== String(teammateId)
      );
    } else if (!existingEntry) {
      nextSharedUsers = [...sharedUsers, { userId: teammateId, permission, ...(role ? { role, capabilities } : {}) }];
    } else nextSharedUsers = sharedUsers.map((entry) => {
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
      metadata: { role: role || null, permission, hasAccess, tableName: table.name },
    });

    return NextResponse.json({ success: true, hasAccess, permission: hasAccess ? permission : null, role: hasAccess ? role || null : null, capabilities: hasAccess ? capabilities : null });
  } catch (err) {
    console.error("[TABLE TEAMMATE PERMISSION][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
