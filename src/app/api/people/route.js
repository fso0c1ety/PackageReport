import { randomUUID } from "crypto";
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

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const trimmedName = String(name || "").trim();

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const existing = await pool.query(
      "SELECT id, name, email, avatar FROM users WHERE LOWER(email) = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (existing.rows[0]) {
      return NextResponse.json({ success: true, person: existing.rows[0], existing: true });
    }

    const created = await pool.query(
      "INSERT INTO users (id, name, email) VALUES ($1, $2, $3) RETURNING id, name, email, avatar",
      [randomUUID(), trimmedName || normalizedEmail.split('@')[0], normalizedEmail]
    );

    return NextResponse.json({ success: true, person: created.rows[0] });
  } catch (err) {
    console.error("[PEOPLE][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
