import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

export const runtime = "nodejs";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.gxzvlsukjodbarlcjyys:Kukupermu1234@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

const SECRET_KEY = process.env.SECRET_KEY || "your_secret_key_here";

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json(
        {
          error:
            "Account not set up for password login. Please register again with the same email to set a password.",
        },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    const avatarUrl =
      user.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.name
      )}&background=random&color=fff&bold=true`;

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: avatarUrl,
      },
    });
  } catch (err) {
    console.error("[LOGIN] Error:", err);
    return NextResponse.json(
      { error: "Internal server error during login" },
      { status: 500 }
    );
  }
}
