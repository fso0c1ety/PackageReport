import jwt from "jsonwebtoken";
import { Pool } from "pg";

export const runtime = "nodejs";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.gxzvlsukjodbarlcjyys:Kukupermu1234@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

export const SECRET_KEY = process.env.SECRET_KEY || "your_secret_key_here";

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export function getAuthenticatedUser(req) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) return null;

  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    return null;
  }
}
