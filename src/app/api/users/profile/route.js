import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, avatar, phone, job_title, company FROM users WHERE id = $1",
      [user.id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("[PROFILE][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, avatar, phone, job_title, company } = await req.json();
    const result = await pool.query(
      "UPDATE users SET name = $1, avatar = $2, phone = $3, job_title = $4, company = $5 WHERE id = $6 RETURNING id, name, email, avatar, phone, job_title, company",
      [name, avatar, phone, job_title, company, user.id]
    );

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "User not found or not updated" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("[PROFILE][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
