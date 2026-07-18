import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

async function ensureSchema() {
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE");
}

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const result = await pool.query("SELECT two_factor_enabled,email FROM users WHERE id=$1", [user.id]);
  if (!result.rows[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ enabled: Boolean(result.rows[0].two_factor_enabled), method: "email", emailHint: result.rows[0].email.replace(/^(.{1,2}).*(@.*)$/, "$1***$2") });
}

export async function PUT(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  if (typeof body.enabled !== "boolean" || !String(body.password || "")) return NextResponse.json({ error: "Password confirmation is required" }, { status: 400 });
  const result = await pool.query("SELECT password FROM users WHERE id=$1", [user.id]);
  if (!result.rows[0]?.password || !await bcrypt.compare(String(body.password), result.rows[0].password)) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  await pool.query("UPDATE users SET two_factor_enabled=$1 WHERE id=$2", [body.enabled, user.id]);
  return NextResponse.json({ enabled: body.enabled, method: "email" });
}
