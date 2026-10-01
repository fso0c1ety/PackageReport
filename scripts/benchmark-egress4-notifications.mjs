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
console.log(JSON.stringify({ notifications: results }, null, 2));
await login.dispose();
await db.end();
