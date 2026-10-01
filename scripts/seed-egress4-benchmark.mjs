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
  await client.query("INSERT INTO workspaces(id,name,owner_id,is_demo) VALUES('44444444-4444-4444-8444-444444444444','TEST_EGRESS4_NOTIFICATIONS','egress4-user',TRUE) ON CONFLICT(id) DO NOTHING");
  await client.query("INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,record_access) VALUES('44444444-4444-4444-8444-444444444444','egress4-user','owner','owner','{\"scope\":\"all\"}') ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO tables(id,name,workspace_id,columns) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','TEST_EGRESS4_A','44444444-4444-4444-8444-444444444444','[]'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','TEST_EGRESS4_B','44444444-4444-4444-8444-444444444444','[]') ON CONFLICT(id) DO NOTHING");
  await client.query("INSERT INTO board_member_access(table_id,user_id,board_role,record_access) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','egress4-user','owner','{\"scope\":\"all\"}'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','egress4-user','owner','{\"scope\":\"all\"}') ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO rows(id,table_id,values,created_by) VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{\"name\":\"TEST_EGRESS4_ROW\"}','egress4-user') ON CONFLICT(id) DO NOTHING");
  await client.query("DELETE FROM notifications WHERE recipient_id='egress4-user'");
  for (let i = 0; i < 50; i++) {
    const tableId = i % 3 === 0 ? "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" : "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const data = { tableId, ...(i % 2 ? { taskId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } : {}) };
    await client.query("INSERT INTO notifications(id,recipient_id,type,data,read,created_at) VALUES($1,'egress4-user','comment',$2::jsonb,FALSE,NOW())", [`egress4-notification-${i}`, JSON.stringify(data)]);
  }
  await client.query("COMMIT");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { await client.end(); }
