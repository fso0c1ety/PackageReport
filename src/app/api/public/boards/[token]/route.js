import { NextResponse } from "next/server";
import { pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const { token } = await params;
  const result = await pool.query(`
    SELECT t.id, t.name, t.columns, t.created_at, t.public_share_title, t.public_share_welcome, t.public_share_comments,
      COALESCE(jsonb_agg(jsonb_build_object('id',r.id,'values',r.values,'created_at',r.created_at) ORDER BY r.created_at) FILTER (WHERE r.id IS NOT NULL),'[]'::jsonb) rows
    FROM tables t LEFT JOIN rows r ON r.table_id=t.id
    WHERE t.public_share_enabled=TRUE AND t.public_share_token=$1
    GROUP BY t.id`, [token]);
  if (!result.rows[0]) return NextResponse.json({ error:"Link unavailable" }, { status:404 });
  return NextResponse.json(result.rows[0], { headers:{"Cache-Control":"private, no-store"} });
}
