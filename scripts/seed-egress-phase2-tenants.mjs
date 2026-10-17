import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const marker = `EGRESS_PHASE2_${process.env.GITHUB_RUN_ID || randomUUID()}`;
const password = process.env.EGRESS_MEASURE_PASSWORD || 'EgressPhase2LocalOnlyA1!';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
const tenants = [];
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ');
  const hash = await bcrypt.hash(password, 4);
  for (let tenantIndex = 1; tenantIndex <= 2; tenantIndex += 1) {
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const email = `${marker.toLowerCase()}-tenant${tenantIndex}@example.test`;
    await client.query('INSERT INTO users(id,name,email,password,email_verified_at) VALUES($1,$2,$3,$4,NOW())', [userId, `${marker} tenant ${tenantIndex}`, email, hash]);
    await client.query('INSERT INTO workspaces(id,name,owner_id) VALUES($1,$2,$3)', [workspaceId, `${marker} tenant ${tenantIndex}`, userId]);
    await client.query('INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3)', [workspaceId, userId, 'owner']);
    tenants.push({ userId, workspaceId, email });
  }
  await client.query('COMMIT');
  const envFile = process.env.GITHUB_ENV;
  if (envFile) await import('node:fs/promises').then(({ appendFile }) => appendFile(envFile, `EGRESS_MEASURE_EMAILS=${tenants.map(({ email }) => email).join(',')}\n`));
  console.log(JSON.stringify({ syntheticTenants: tenants.length, markerPrefix: marker.slice(0, 18) }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally { client.release(); await pool.end(); }
