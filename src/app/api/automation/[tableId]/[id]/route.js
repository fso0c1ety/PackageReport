import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId, id } = await params;
    await pool.query("DELETE FROM automations WHERE id = $1 AND table_id = $2", [id, tableId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AUTOMATION/:tableId/:id][DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
