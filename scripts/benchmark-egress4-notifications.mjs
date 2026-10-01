import fs from "node:fs";
import pg from "pg";
import { request } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const password = process.env.EGRESS4_PASSWORD;
const file = process.env.EGRESS4_QUERY_FILE;
const login = await request.newContext({ baseURL });
const authResponse = await login.post("/api/login/", { data: { email: "egress4-user@example.test", password }, headers: { Origin: baseURL } });
if (!authResponse.ok()) throw new Error(`login failed: ${authResponse.status()}`);
const { token } = await authResponse.json();
const results = {};
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false });
await db.connect();
for (const size of [1, 10, 50]) {
  await db.query("DELETE FROM notifications WHERE recipient_id='egress4-user'");
  for (let i = 0; i < size; i++) {
    const tableId = i % 3 === 0 ? "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" : "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const data = { tableId, ...(i % 2 ? { taskId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } : {}) };
    await db.query("INSERT INTO notifications(id,recipient_id,type,data,read,created_at) VALUES($1,'egress4-user','comment',$2::jsonb,FALSE,NOW())", [`egress4-notification-${i}`, JSON.stringify(data)]);
  }
  const before = file && fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length : 0;
  const started = performance.now();
  const response = await login.get("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.body();
  const after = file && fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length : before;
  results[size] = { queries: after - before, requests: 1, bytes: body.byteLength, runtimeMs: Math.round(performance.now() - started), status: response.status() };
}
await db.query("DELETE FROM notifications WHERE recipient_id='egress4-user'");
await db.query("INSERT INTO professional_invitations(id,workspace_id,table_id,inviter_id,recipient_id,status) VALUES('egress4-invite-pending','44444444-4444-4444-8444-444444444444','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','egress4-user-b','egress4-user','pending'),('egress4-invite-invalid','44444444-4444-4444-8444-444444444444','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','egress4-user-b','egress4-user','accepted') ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status");
const matrixRows = [
  ['egress4-matrix-allowed-row', { tableId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', taskId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }],
  ['egress4-matrix-denied-row', { tableId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', taskId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }],
  ['egress4-matrix-allowed-board', { tableId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }],
  ['egress4-matrix-denied-board', { tableId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }],
  ['egress4-matrix-duplicate', { tableId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', taskId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }],
];
await db.query("INSERT INTO notifications(id,recipient_id,type,data,read,created_at) VALUES('egress4-matrix-pending-invite','egress4-user','invite',$1::jsonb,FALSE,NOW()),('egress4-matrix-invalid-invite','egress4-user','invite',$2::jsonb,FALSE,NOW())", [JSON.stringify({ invitationId: 'egress4-invite-pending' }), JSON.stringify({ invitationId: 'egress4-invite-invalid' })]);
for (const [id, data] of matrixRows) {
  await db.query("INSERT INTO notifications(id,recipient_id,type,data,read,created_at) VALUES($1,'egress4-user','comment',$2::jsonb,FALSE,NOW())", [id, JSON.stringify(data)]);
}
await db.query("INSERT INTO notifications(id,recipient_id,type,data,read,created_at) VALUES('egress4-matrix-cross-user','egress4-user-b','comment',$1::jsonb,FALSE,NOW())", [JSON.stringify({ tableId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })]);
const matrixResponse = await login.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
const matrixBody = await matrixResponse.json();
const exactVisibleIds = (Array.isArray(matrixBody) ? matrixBody : (matrixBody.notifications || [])).map((item) => String(item.id)).filter((id) => id.startsWith('egress4-matrix-'));
const expectedVisibleIds = ['egress4-matrix-allowed-row', 'egress4-matrix-allowed-board', 'egress4-matrix-duplicate', 'egress4-matrix-pending-invite', 'egress4-matrix-invalid-invite'];
const permissionMatrix = {
  exactVisibleIds,
  expectedVisibleIds,
  allowedRow: exactVisibleIds.includes('egress4-matrix-allowed-row'),
  deniedRow: !exactVisibleIds.includes('egress4-matrix-denied-row'),
  allowedBoard: exactVisibleIds.includes('egress4-matrix-allowed-board'),
  deniedBoard: !exactVisibleIds.includes('egress4-matrix-denied-board'),
  crossUser: !exactVisibleIds.includes('egress4-matrix-cross-user'),
  crossWorkspace: !exactVisibleIds.includes('egress4-matrix-denied-board'),
  repeatedTarget: exactVisibleIds.includes('egress4-matrix-duplicate'),
  pendingInvitation: exactVisibleIds.includes('egress4-matrix-pending-invite'),
  invalidInvitation: exactVisibleIds.includes('egress4-matrix-invalid-invite'),
  pass: JSON.stringify([...exactVisibleIds].sort()) === JSON.stringify([...expectedVisibleIds].sort()),
};
console.log(JSON.stringify({ notifications: results, permissionMatrix }, null, 2));
await login.dispose();
await db.end();
