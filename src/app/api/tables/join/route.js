import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { requireWritableSubscription } from "../../_lib/billing";
import { upsertTableMembership } from "../../_lib/tableMembership";
import inviteCodes from "../../../../../server/services/tableInviteCode.js";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { inviteCode } = await req.json();
    const normalizedCode = inviteCodes.normalizeInviteCode(inviteCode);

    if (!inviteCodes.isValidInviteCode(normalizedCode)) {
      return NextResponse.json({ error: "A valid invite code is required" }, { status: 400 });
    }

    const tableRes = await pool.query(
      `SELECT t.*,w.owner_id FROM tables t
       JOIN workspaces w ON w.id=t.workspace_id
       WHERE UPPER(t.invite_code) = $1`,
      [normalizedCode]
    );

    const table = tableRes.rows[0];
    if (!table) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    const billingError = await requireWritableSubscription(user.id, { tableId: table.id });
    if (billingError) return billingError;

    if (String(table.owner_id) !== String(user.id)) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const locked = await client.query("SELECT * FROM tables WHERE id=$1 FOR UPDATE", [table.id]);
        if (!locked.rows[0]) throw new Error("Table no longer exists");
        await upsertTableMembership(client, locked.rows[0], user.id, {
          boardRole: "editor",
          workspaceRole: "member",
          portalType: "standard",
          recordAccess: { scope: "all_permitted" },
          preserveExisting: true,
        });
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    return NextResponse.json({
      success: true,
      tableId: table.id,
      workspaceId: table.workspace_id,
    });
  } catch (err) {
    console.error("[TABLES][JOIN] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
