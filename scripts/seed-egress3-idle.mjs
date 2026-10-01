import bcrypt from "bcryptjs";
import pg from "pg";

const email = process.env.EGRESS3_EMAIL || "egress3-manager@example.test";
const driverEmail = process.env.EGRESS3_DRIVER_EMAIL || "egress3-driver@example.test";
const password = process.env.EGRESS3_PASSWORD;
if (!password) throw new Error("EGRESS3_PASSWORD is required");
const userId = "egress3-demo-manager";
const driverId = "egress3-demo-driver";
const workspaceId = "egress3-demo-workspace";
const tableId = "egress3-demo-table";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false });
await client.connect();
try {
  const hash = await bcrypt.hash(password, 4);
  await client.query("BEGIN");
  await client.query("INSERT INTO users (id,name,email,password,email_verified_at) VALUES ($1,$2,$3,$4,NOW()),($5,$6,$7,$4,NOW()) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,password=EXCLUDED.password", [userId, "EGRESS3 Manager", email, hash, driverId, "EGRESS3 Driver", driverEmail]);
  await client.query("INSERT INTO workspaces (id,name,owner_id,is_demo,template_key) VALUES ($1,$2,$3,TRUE,'fleet_management') ON CONFLICT (id) DO UPDATE SET owner_id=EXCLUDED.owner_id,is_demo=TRUE,template_key='fleet_management'", [workspaceId, "TEST_EGRESS3_IDLE", userId]);
  await client.query("INSERT INTO workspace_members (workspace_id,user_id,role,workspace_role,job_roles,primary_job_role,portal_type,permitted_portals,landing_route,record_access) VALUES ($1,$2,'owner','admin','[\"manager\"]','manager','manager','[\"manager\"]','/workspace','{\"scope\":\"all\"}'),($1,$3,'driver','member','[\"driver\"]','driver','driver','[\"driver\"]','/driver-trips','{\"scope\":\"assigned_to_me\",\"field\":\"_assignedDriverUserId\"}') ON CONFLICT DO NOTHING", [workspaceId, userId, driverId]);
  const columns = [{ id: "tripNumber", name: "Trip Number", type: "Text", order: 0 }, { id: "status", name: "Status", type: "Status", order: 1, options: [{ value: "Assigned" }, { value: "Delivered" }] }, { id: "driver", name: "Driver", type: "People", order: 2 }, { id: "pickup", name: "Pickup", type: "Text", order: 3 }, { id: "delivery", name: "Delivery", type: "Text", order: 4 }];
  await client.query("INSERT INTO tables (id,name,workspace_id,columns,invite_code) VALUES ($1,'Trips',$2,$3,'EGRESS3') ON CONFLICT (id) DO UPDATE SET name='Trips',columns=EXCLUDED.columns", [tableId, workspaceId, JSON.stringify(columns)]);
  await client.query("INSERT INTO board_member_access (table_id,user_id,board_role,record_access) VALUES ($1,$2,'owner','{\"scope\":\"all\"}'),($1,$3,'viewer','{\"scope\":\"assigned_to_me\",\"field\":\"_assignedDriverUserId\"}') ON CONFLICT DO NOTHING", [tableId, userId, driverId]);
  await client.query("DELETE FROM rows WHERE table_id=$1", [tableId]);
  for (let i = 0; i < 100; i++) await client.query("INSERT INTO rows (id,table_id,values,created_by) VALUES ($1,$2,$3,$4)", [`egress3-row-${i}`, tableId, JSON.stringify({ tripNumber: `TEST_EGRESS3_TRIP_${i}`, status: i % 2 ? "Assigned" : "Delivered", driver: [{ id: driverId, userId: driverId, name: "EGRESS3 Driver", email: driverEmail }], pickup: "Test Pickup", delivery: "Test Delivery", _workspaceId: workspaceId, _assignedDriverUserId: driverId }), userId]);
  await client.query("COMMIT");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { await client.end(); }
