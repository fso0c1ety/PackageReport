import { NextResponse } from "next/server";
import { pool } from "../../../../_lib/server";
import { authenticateApiRequest, ownerCanAccessBoard, paginated, pagination } from "../../../_lib/apiAuth";

export async function GET(req, { params }) {
  const auth = await authenticateApiRequest(req);
  if (auth.error) return auth.error;
  const { boardId } = await params;
  if (!await ownerCanAccessBoard(boardId, auth.userId)) return NextResponse.json({ error: "Board not found" }, { status: 404 });
  const { limit, offset } = pagination(req, 500);
  const result = await pool.query("SELECT id,values,created_at,updated_at FROM rows WHERE table_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", [boardId, limit, offset]);
  return paginated(result.rows, limit, offset);
}
