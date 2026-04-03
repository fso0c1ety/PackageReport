import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await pool.query(
      "SELECT id, name, email, avatar FROM users WHERE id = $1",
      [id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      ...row,
      avatar:
        row.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          row.name
        )}&background=random&color=fff&bold=true`,
    });
  } catch (err) {
    console.error("[PEOPLE/:id][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
