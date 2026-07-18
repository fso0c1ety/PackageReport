import { pool } from "../../_lib/server";
import { authenticateApiRequest, paginated, pagination } from "../_lib/apiAuth";

export async function GET(req) {
  const auth = await authenticateApiRequest(req);
  if (auth.error) return auth.error;
  const { limit, offset } = pagination(req);
  const result = await pool.query(`SELECT w.id,w.name,w.created_at,COUNT(t.id)::int AS board_count
    FROM workspaces w LEFT JOIN tables t ON t.workspace_id=w.id
    WHERE w.owner_id=$1 GROUP BY w.id ORDER BY w.created_at DESC LIMIT $2 OFFSET $3`, [auth.userId, limit, offset]);
  return paginated(result.rows, limit, offset);
}
