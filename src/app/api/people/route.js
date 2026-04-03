import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    let result;
    if (q) {
      result = await pool.query(
        "SELECT id, name, email, avatar FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 10",
        [`%${q}%`]
      );
    } else {
      result = await pool.query("SELECT id, name, email, avatar FROM users LIMIT 10");
    }

    const people = result.rows.map((row) => ({
      ...row,
      avatar:
        row.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          row.name
        )}&background=random&color=fff&bold=true`,
    }));

    return NextResponse.json(people);
  } catch (err) {
    console.error("[PEOPLE][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
