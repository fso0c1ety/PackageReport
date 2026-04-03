import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { Pool } from "pg";

export const runtime = "nodejs";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.gxzvlsukjodbarlcjyys:Kukupermu1234@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const existingUser = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      if (existingUser.password) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }

      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=random&color=fff&bold=true`;

      await pool.query(
        "UPDATE users SET name = $1, password = $2, avatar = $3 WHERE id = $4",
        [name, hashedPassword, avatarUrl, existingUser.id]
      );

      return NextResponse.json({
        success: true,
        message: "Account updated with password and avatar successfully",
      });
    }

    const userId = uuidv4();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&bold=true`;

    await pool.query(
      "INSERT INTO users (id, name, email, avatar, password) VALUES ($1, $2, $3, $4, $5)",
      [userId, name, email, avatarUrl, hashedPassword]
    );

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("[REGISTER] Error:", err);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
