import { NextResponse } from "next/server";
import { pool } from "../../../_lib/server";
import { authenticateApiRequest, ownerCanAccessBoard } from "../../_lib/apiAuth";

export async function GET(req, { params }) {
  const auth = await authenticateApiRequest(req);
  if (auth.error) return auth.error;
  const { boardId } = await params;
  if (!await ownerCanAccessBoard(boardId, auth.userId)) return NextResponse.json({ error: "Board not found" }, { status: 404 });
  const result = await pool.query("SELECT id,name,workspace_id,columns,created_at FROM tables WHERE id=$1", [boardId]);
  return NextResponse.json({ data: result.rows[0] }, { headers: { "Cache-Control": "private, no-store" } });
}
