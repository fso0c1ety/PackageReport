import jwt from "jsonwebtoken";
import { Pool } from "pg";

export const runtime = "nodejs";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.gxzvlsukjodbarlcjyys:Kukupermu1234@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

export const SECRET_KEY = process.env.JWT_SECRET || process.env.SECRET_KEY || "your_secret_key_here";

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : {
      query() {
        throw new Error("Missing required environment variable: DATABASE_URL");
      },
    };

export async function ensureUserNotificationColumns() {
  // Columns are managed by server/db/migrations/001_core_saas_schema.sql.
  // Kept as a compatibility hook for older callers.
  return true;
}

let extendedProfileColumnsPromise;

export function ensureExtendedUserProfileColumns() {
  if (!extendedProfileColumnsPromise) {
    extendedProfileColumnsPromise = pool.query(`
      ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS last_name TEXT,
        ADD COLUMN IF NOT EXISTS birth_date DATE,
        ADD COLUMN IF NOT EXISTS gender TEXT
    `).catch((error) => {
      extendedProfileColumnsPromise = undefined;
      throw error;
    });
  }

  return extendedProfileColumnsPromise;
}

export function getAuthenticatedUser(req) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) return null;
  if (!SECRET_KEY) return null;

  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    return null;
  }
}
