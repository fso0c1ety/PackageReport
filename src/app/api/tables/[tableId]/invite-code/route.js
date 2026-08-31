import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import inviteCodes from "../../../../../../server/services/tableInviteCode.js";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tableId } = await params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`SELECT t.id,t.invite_code,t.workspace_id,w.owner_id
      FROM tables t JOIN workspaces w ON w.id=t.workspace_id
      WHERE t.id=$1 FOR UPDATE OF t`, [tableId]);
    const table = result.rows[0];
    if (!table) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }
    if (String(table.owner_id) !== String(user.id)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Only workspace owners can manage invite codes" }, { status: 403 });
    }

    let inviteCode = inviteCodes.normalizeInviteCode(table.invite_code);
    if (!inviteCodes.isValidInviteCode(inviteCode)) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('smart-manage-table-invite-code'))");
      inviteCode = null;
      for (let attempt = 0; attempt < 10 && !inviteCode; attempt += 1) {
        const candidate = inviteCodes.generateInviteCode();
        const collision = await client.query("SELECT 1 FROM tables WHERE UPPER(invite_code)=$1 AND id<>$2 LIMIT 1", [candidate, tableId]);
        if (collision.rows.length === 0) inviteCode = candidate;
      }
      if (!inviteCode) throw new Error("Unable to allocate a unique invite code");
      await client.query("UPDATE tables SET invite_code=$1 WHERE id=$2", [inviteCode, tableId]);
    }
    await client.query("COMMIT");
    return NextResponse.json({ invite_code: inviteCode });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("[TABLE INVITE CODE][POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
