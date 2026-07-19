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
        ADD COLUMN IF NOT EXISTS gender TEXT,
        ADD COLUMN IF NOT EXISTS driver_license TEXT,
        ADD COLUMN IF NOT EXISTS driver_license_expiry DATE,
        ADD COLUMN IF NOT EXISTS passport JSONB
    `).catch((error) => {
      extendedProfileColumnsPromise = undefined;
      throw error;
    });
  }

  return extendedProfileColumnsPromise;
}

export async function ensureFleetDriverAccess(user) {
  if (!user?.id || !user?.email) return [];
  const assigned = await pool.query(
    `SELECT DISTINCT t.workspace_id
       FROM tables t
       JOIN rows r ON r.table_id = t.id
      WHERE LOWER(t.name) = 'drivers'
        AND EXISTS (
          SELECT 1
            FROM jsonb_each(COALESCE(r.values, '{}'::jsonb)) AS cell
            CROSS JOIN LATERAL jsonb_array_elements(
              CASE WHEN jsonb_typeof(cell.value) = 'array' THEN cell.value ELSE '[]'::jsonb END
            ) AS person
           WHERE person->>'id' = $1 OR LOWER(person->>'email') = LOWER($2)
        )`,
    [String(user.id), String(user.email)]
  );
  const employeeFleet = await pool.query(
    `SELECT DISTINCT t.workspace_id
       FROM tables t
      WHERE LOWER(t.name) = ANY($2)
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(t.shared_users, '[]'::jsonb)) AS member
           WHERE member->>'userId' = $1
             AND COALESCE(member->>'role', 'employee') IN ('employee', 'driver')
        )`,
    [String(user.id), ['trucks', 'drivers', 'trips', 'fuel', 'maintenance', 'expenses', 'documents']]
  );
  const workspaceIds = [...new Set([...assigned.rows, ...employeeFleet.rows].map((row) => row.workspace_id))];
  if (!workspaceIds.length) return [];
  const fleetBoards = ['trucks', 'drivers', 'trips', 'fuel', 'maintenance', 'expenses', 'documents'];
  const tables = await pool.query(
    `SELECT id, shared_users FROM tables
      WHERE workspace_id = ANY($1)
        AND LOWER(name) = ANY($2)`,
    [workspaceIds, fleetBoards]
  );
  for (const table of tables.rows) {
    const sharedUsers = Array.isArray(table.shared_users) ? table.shared_users : [];
    if (sharedUsers.some((entry) => String(entry?.userId) === String(user.id))) continue;
    sharedUsers.push({ userId: String(user.id), permission: 'edit', role: 'employee' });
    await pool.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), table.id]);
  }
  return workspaceIds;
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
