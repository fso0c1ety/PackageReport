import bcrypt from "bcryptjs";
import pg from "pg";

const password = process.env.EGRESS4_PASSWORD;
if (!password) throw new Error("EGRESS4_PASSWORD is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false });
await client.connect();
try {
  const hash = await bcrypt.hash(password, 4);
  await client.query("BEGIN");
  await client.query("INSERT INTO users(id,name,email,password,email_verified_at) VALUES('egress4-user','EGRESS4 User','egress4-user@example.test',$1,NOW()) ON CONFLICT(id) DO UPDATE SET password=EXCLUDED.password", [hash]);
  await client.query("INSERT INTO workspaces(id,name,owner_id,is_demo) VALUES('egress4-workspace','TEST_EGRESS4_NOTIFICATIONS','egress4-user',TRUE) ON CONFLICT(id) DO NOTHING");
  await client.query("INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,record_access) VALUES('egress4-workspace','egress4-user','owner','owner','{\"scope\":\"all\"}') ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO tables(id,name,workspace_id,columns) VALUES('egress4-table-a','TEST_EGRESS4_A','egress4-workspace','[]'),('egress4-table-b','TEST_EGRESS4_B','egress4-workspace','[]') ON CONFLICT(id) DO NOTHING");
  await client.query("INSERT INTO board_member_access(table_id,user_id,board_role,record_access) VALUES('egress4-table-a','egress4-user','owner','{\"scope\":\"all\"}'),('egress4-table-b','egress4-user','owner','{\"scope\":\"all\"}') ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO rows(id,table_id,values,created_by) VALUES('egress4-row-a','egress4-table-a','{\"name\":\"TEST_EGRESS4_ROW\"}','egress4-user') ON CONFLICT(id) DO NOTHING");
  await client.query("DELETE FROM notifications WHERE recipient_id='egress4-user'");
  for (let i = 0; i < 50; i++) {
    const tableId = i % 3 === 0 ? "egress4-table-b" : "egress4-table-a";
    const data = { tableId, taskId: i % 2 ? "egress4-row-a" : undefined };
    await client.query("INSERT INTO notifications(id,recipient_id,type,data,read,created_at) VALUES($1,'egress4-user','comment',$2::jsonb,FALSE,NOW())", [`egress4-notification-${i}`, JSON.stringify(data)]);
  }
  await client.query("COMMIT");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { await client.end(); }
