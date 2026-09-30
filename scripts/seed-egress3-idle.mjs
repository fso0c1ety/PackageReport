import bcrypt from "bcryptjs";
import pg from "pg";

const email = process.env.EGRESS3_EMAIL || "demo@smartmanage.com";
const password = process.env.EGRESS3_PASSWORD;
if (!password) throw new Error("EGRESS3_PASSWORD is required");
const userId = "egress3-demo-user";
const workspaceId = "egress3-demo-workspace";
const tableId = "egress3-demo-table";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false });
await client.connect();
try {
  const hash = await bcrypt.hash(password, 4);
  await client.query("BEGIN");
  await client.query("INSERT INTO users (id,name,email,password) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,password=EXCLUDED.password", [userId, "EGRESS3 Demo", email, hash]);
  await client.query("INSERT INTO workspaces (id,name,owner_id) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET owner_id=EXCLUDED.owner_id", [workspaceId, "TEST_EGRESS3_IDLE", userId]);
  if ((await client.query("SELECT to_regclass('public.workspace_members') IS NOT NULL AS exists")).rows[0].exists) {
    await client.query("INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING", [workspaceId, userId]);
  }
  const columns = [{ id: "name", name: "Name", type: "Text", order: 0 }, { id: "status", name: "Status", type: "Status", order: 1, options: [{ value: "Open" }, { value: "Done" }] }];
  await client.query("INSERT INTO tables (id,name,workspace_id,columns,invite_code) VALUES ($1,$2,$3,$4,'EGRESS3') ON CONFLICT (id) DO UPDATE SET columns=EXCLUDED.columns", [tableId, "TEST_EGRESS3_IDLE", workspaceId, JSON.stringify(columns)]);
  await client.query("DELETE FROM rows WHERE table_id=$1", [tableId]);
  for (let i = 0; i < 100; i++) await client.query("INSERT INTO rows (id,table_id,values,created_by) VALUES ($1,$2,$3,$4)", [`egress3-row-${i}`, tableId, JSON.stringify({ name: `TEST_EGRESS3_ROW_${i}`, status: i % 2 ? "Open" : "Done" }), userId]);
  await client.query("COMMIT");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { await client.end(); }
