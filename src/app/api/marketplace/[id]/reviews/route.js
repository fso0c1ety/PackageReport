import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await pool.query(`SELECT mr.*,u.name AS user_name FROM marketplace_reviews mr
    LEFT JOIN users u ON u.id=mr.user_id WHERE mr.template_id=$1 ORDER BY mr.created_at DESC`, [id]);
  return NextResponse.json(rows);
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    const rating = Math.max(1, Math.min(5, Number(body?.rating) || 0));
    const review = String(body?.review || "").trim().slice(0, 1000);
    const reviewId = randomUUID();
    const { rows } = await pool.query(`INSERT INTO marketplace_reviews(id,template_id,user_id,rating,review)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(template_id,user_id) DO UPDATE SET rating=EXCLUDED.rating,
      review=EXCLUDED.review,created_at=NOW() RETURNING *`, [reviewId, id, user.id, rating, review]);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("[MARKETPLACE][REVIEWS][POST]", error);
    return NextResponse.json({ error: "Unable to save review" }, { status: 500 });
  }
}
