import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";
import { getWorkspaceTemplateManifest } from "../src/workspaceTemplates.ts";

const DEMO_EMAIL = "demo@smartmanage.com";
const DEMO_WORKSPACE_NAME = "Smart Manage Demo";
const DEMO_TEMPLATE_KEY = "project_management";

export function assertDemoPassword(password) {
  if (!password || password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("SMART_MANAGE_DEMO_PASSWORD must be at least 12 characters and include upper-case, lower-case and a number");
  }
}

export function assertWorkspaceMayBeSeeded(workspace) {
  if (!workspace || workspace.is_demo !== true) {
    throw new Error("Refusing to seed a workspace that is not explicitly marked as demo");
  }
}

async function assertDemoAccountIsolation(client, userId) {
  const access = await client.query(`
    SELECT DISTINCT w.id, w.name, w.is_demo
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$1::text
    WHERE w.owner_id::text=$1::text OR wm.user_id IS NOT NULL
  `, [userId]);
  const unsafe = access.rows.filter((workspace) => workspace.is_demo !== true);
  if (unsafe.length) {
    throw new Error(`Demo account isolation violation: access to non-demo workspace ${unsafe[0].id}`);
  }
}

async function ensureDemoUser(client, password) {
  const existing = await client.query("SELECT id, password FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1", [DEMO_EMAIL]);
  const passwordHash = await bcrypt.hash(password, 12);
  if (existing.rows[0]) {
    await assertDemoAccountIsolation(client, existing.rows[0].id);
    const matches = existing.rows[0].password && await bcrypt.compare(password, existing.rows[0].password);
    if (!matches) await client.query("UPDATE users SET password=$1, email_verified_at=COALESCE(email_verified_at,NOW()), updated_at=NOW() WHERE id=$2", [passwordHash, existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const userId = randomUUID();
  await client.query(`INSERT INTO users(id,name,email,password,first_name,last_name,company,email_verified_at,created_at,updated_at)
    VALUES($1,'Smart Manage Demo',$2,$3,'Smart Manage','Demo','Smart Manage',NOW(),NOW(),NOW())`, [userId, DEMO_EMAIL, passwordHash]);
  return userId;
}

async function ensureDemoWorkspace(client, userId, template) {
  const existing = await client.query("SELECT * FROM workspaces WHERE owner_id=$1 AND name=$2 LIMIT 1", [userId, DEMO_WORKSPACE_NAME]);
  if (existing.rows[0]) {
    assertWorkspaceMayBeSeeded(existing.rows[0]);
    return existing.rows[0].id;
  }
  const workspaceId = randomUUID();
  await client.query(`INSERT INTO workspaces(id,name,owner_id,template_key,is_demo,demo_expires_at,demo_metadata,created_at,updated_at)
    VALUES($1,$2,$3,$4,TRUE,NOW()+INTERVAL '180 days',$5::jsonb,NOW(),NOW())`, [
    workspaceId, DEMO_WORKSPACE_NAME, userId, template.key,
    JSON.stringify({ purpose: "marketing_screenshots", seedVersion: 1, templateKey: template.key }),
  ]);
  await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,job_roles,portal_type,landing_route,record_access)
    VALUES($1,$2,'owner','owner','[]'::jsonb,'standard','/dashboard','{"scope":"all_permitted"}'::jsonb)
    ON CONFLICT(workspace_id,user_id) DO UPDATE SET workspace_role='owner',role='owner',portal_type='standard',landing_route='/dashboard',updated_at=NOW()`, [workspaceId, userId]);
  return workspaceId;
}

async function seedTemplateFoundation(client, workspaceId, userId, template) {
  const workspace = (await client.query("SELECT id,is_demo FROM workspaces WHERE id=$1 FOR UPDATE", [workspaceId])).rows[0];
  assertWorkspaceMayBeSeeded(workspace);
  const existingTables = await client.query("SELECT id,name FROM tables WHERE workspace_id=$1 ORDER BY created_at", [workspaceId]);
  if (existingTables.rows.length) return existingTables.rows;

  const created = [];
  for (const board of template.boards) {
    const tableId = randomUUID();
    const columns = board.columns.map((column, order) => ({ ...column, id: randomUUID(), order }));
    await client.query("INSERT INTO tables(id,name,workspace_id,columns,created_at,updated_at) VALUES($1,$2,$3,$4::jsonb,NOW(),NOW())", [tableId, board.name, workspaceId, JSON.stringify(columns)]);
    const sample = board.rows?.[0];
    if (sample) {
      const values = {};
      for (const column of columns) {
        const raw = sample[column.name];
        if (raw !== undefined && !raw?.__relationBoard && !raw?.__currentUser) values[column.id] = raw;
      }
      await client.query("INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) VALUES($1,$2,$3::jsonb,$4,NOW(),NOW())", [randomUUID(), tableId, JSON.stringify(values), userId]);
    }
    created.push({ id: tableId, name: board.name });
  }
  return created;
}

export async function seedMarketingDemo({ connectionString = process.env.DATABASE_URL, password = process.env.SMART_MANAGE_DEMO_PASSWORD } = {}) {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  assertDemoPassword(password);
  const template = getWorkspaceTemplateManifest(DEMO_TEMPLATE_KEY);
  const pool = new pg.Pool({ connectionString, ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const schema = await client.query("SELECT to_regclass('public.demo_requests') AS demo_requests, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='is_demo') AS has_demo_flag");
    if (!schema.rows[0]?.demo_requests || !schema.rows[0]?.has_demo_flag) throw new Error("Migration 027_demo_requests_and_demo_workspaces.sql must be applied first");
    const userId = await ensureDemoUser(client, password);
    const workspaceId = await ensureDemoWorkspace(client, userId, template);
    await assertDemoAccountIsolation(client, userId);
    const boards = await seedTemplateFoundation(client, workspaceId, userId, template);
    await client.query("COMMIT");
    const manifest = { generatedAt: new Date().toISOString(), userEmail: DEMO_EMAIL, workspaceId, templateKey: template.key, routes: { dashboard: `/dashboard/?workspaceId=${workspaceId}`, workspace: `/workspace/?id=${workspaceId}` }, boards: Object.fromEntries(boards.map((board) => [board.name, board.id])) };
    const manifestPath = path.join(path.dirname(fileURLToPath(import.meta.url)), ".marketing-demo-manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    return manifest;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedMarketingDemo().then((manifest) => {
    console.log(`Marketing demo ready: ${manifest.workspaceId}`);
  }).catch((error) => {
    console.error(`Marketing demo seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}

