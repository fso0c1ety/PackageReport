import pg from "pg";
import bcrypt from "bcryptjs";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const variant = process.env.BENCHMARK_VARIANT || "HEAD";
const output = process.env.OUTPUT_JSON || `artifacts/${variant}.json`;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false });
await db.connect();
const suffix = variant.toLowerCase();
const ids = { user: `http-owner-${suffix}`, other: `http-member-${suffix}`, demo: `http-demo-${suffix}`, normal: `http-normal-${suffix}`, table: `http-table-${suffix}` };
const password = "HttpIntegrationOnlyA1!";
const email = `${ids.user}@local.invalid`;
const metrics = { variant, http: [], db: {}, scenarios: {}, billedSupabaseEgress: "UNKNOWN" };
let server;
try {
  await db.query("DELETE FROM workspaces WHERE id = ANY($1::text[])", [[ids.demo, ids.normal]]);
  await db.query("DELETE FROM users WHERE id = ANY($1::text[])", [[ids.user, ids.other]]);
  const hash = await bcrypt.hash(password, 4);
  await db.query("INSERT INTO users(id,name,email,password) VALUES($1,$2,$3,$4),($5,$6,$7,$4)", [ids.user, "HTTP Owner", email, hash, ids.other, "Member Owner", `${ids.other}@local.invalid`]);
  await db.query("INSERT INTO workspaces(id,name,owner_id,is_demo,demo_expires_at) VALUES($1,'HTTP Demo',$2,TRUE,NOW()+INTERVAL '1 day'),($3,'HTTP Normal',$2,FALSE,NULL)", [ids.demo, ids.user, ids.normal]);
  await db.query("INSERT INTO tables(id,name,workspace_id) VALUES($1,'HTTP Demo Board',$2)", [ids.table, ids.demo]);
  await db.query("INSERT INTO rows(id,table_id,values,created_by) VALUES($1,$2,'{}'::jsonb,$3)", [`${ids.table}-row`, ids.table, ids.user]);
  await db.query("UPDATE workspaces SET demo_expires_at=NOW()-INTERVAL '1 day' WHERE id=$1", [ids.demo]);
  await db.query("INSERT INTO workspace_members(workspace_id,user_id,workspace_role,role) VALUES($1,$2,'owner','owner') ON CONFLICT DO NOTHING", [ids.demo, ids.other]);

  server = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev", "--", "-H", "127.0.0.1", "-p", "3000"], { env: { ...process.env, NEXT_PUBLIC_API_URL: "http://127.0.0.1:3000" }, stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { const r = await fetch("http://127.0.0.1:3000/login/"); if (r.ok || r.status === 200) break; } catch {} await new Promise(r => setTimeout(r, 1000)); }
  const requests = async (url, options = {}) => {
    const started = performance.now(); const response = await fetch(`http://127.0.0.1:3000${url}`, options);
    const body = await response.arrayBuffer(); metrics.http.push({ url, status: response.status, bytes: body.byteLength, elapsedMs: performance.now() - started }); return response.status;
  };
  const login = await fetch("http://127.0.0.1:3000/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const loginBody = await login.json();
  if (!login.ok || !loginBody.token) throw new Error(`login failed: ${login.status}`);
  const cookie = login.headers.get("set-cookie")?.split(";")[0] || `access_token=${loginBody.token}`;
  const auth = { headers: { cookie } };
  metrics.http.push({ url: "/api/login", status: login.status, bytes: Buffer.byteLength(JSON.stringify(loginBody)) });
  metrics.scenarios.billingExpiredDemo = await requests("/api/billing/status", auth);
  metrics.scenarios.ownerDeleteExpiredDemo = await requests(`/api/workspaces/${ids.demo}`, { ...auth, method: "DELETE" });
  const memberLogin = await fetch("http://127.0.0.1:3000/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `${ids.other}@local.invalid`, password }) });
  const memberBody = await memberLogin.json(); const memberCookie = memberLogin.headers.get("set-cookie")?.split(";")[0] || `access_token=${memberBody.token}`;
  metrics.scenarios.memberOwnerDelete = await requests(`/api/workspaces/${ids.normal}`, { headers: { cookie: memberCookie }, method: "DELETE" });
  const state = await db.query("SELECT (SELECT count(*) FROM workspaces WHERE id=$1)::int AS demo_remaining,(SELECT count(*) FROM tables WHERE workspace_id=$1)::int AS boards_remaining", [ids.demo]);
  metrics.db.finalState = state.rows[0];
  metrics.http.totalRequests = metrics.http.length;
  metrics.http.totalResponseBytes = metrics.http.reduce((sum, row) => sum + row.bytes, 0);
  await writeFile(output, JSON.stringify(metrics, null, 2));
} finally {
  if (server) server.kill("SIGTERM");
  await db.query("DELETE FROM workspaces WHERE id = ANY($1::text[])", [[ids.demo, ids.normal]]).catch(() => {});
  await db.query("DELETE FROM users WHERE id = ANY($1::text[])", [[ids.user, ids.other]]).catch(() => {});
  await db.end();
}
