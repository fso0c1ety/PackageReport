import pg from "pg";
import { verifyDemoDatabaseTarget } from "./verify-demo-database-target.mjs";

const email = String(process.env.PLATFORM_STAFF_EMAIL || "").trim().toLowerCase();
const role = String(process.env.PLATFORM_STAFF_ROLE || "").trim();
const allowedRoles = new Set(["platform_admin", "demo_manager", "demo_sales"]);

if (!email || !email.includes("@")) throw new Error("PLATFORM_STAFF_EMAIL is required");
if (!allowedRoles.has(role)) throw new Error("PLATFORM_STAFF_ROLE must be platform_admin, demo_manager or demo_sales");

await verifyDemoDatabaseTarget();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

try {
  const user = (await pool.query("SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1", [email])).rows[0];
  if (!user) throw new Error("The platform staff account does not exist");
  await pool.query(
    `INSERT INTO platform_staff_roles (user_id,role,permissions,active,granted_by,updated_at)
     VALUES ($1,$2,'[]'::jsonb,TRUE,$1,NOW())
     ON CONFLICT (user_id) DO UPDATE SET role=EXCLUDED.role,active=TRUE,updated_at=NOW()`,
    [user.id, role]
  );
  console.log(JSON.stringify({ success: true, role }, null, 2));
} finally {
  await pool.end();
}
