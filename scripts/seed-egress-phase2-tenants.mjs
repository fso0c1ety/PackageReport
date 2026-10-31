import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const marker = `EGRESS_PHASE2_${process.env.GITHUB_RUN_ID || randomUUID()}`;
const password = process.env.EGRESS_MEASURE_PASSWORD || 'EgressPhase2LocalOnlyA1!';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
const tenants = [];
const tableIds = [];
const taskCounts = (process.env.EGRESS_TASK_COUNTS || '5000,10000').split(',').map(Number);
if (taskCounts.length !== 2 || taskCounts.some((count) => !Number.isInteger(count) || count < 1)) throw new Error('EGRESS_TASK_COUNTS must contain two positive integers');
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
    const tableId = randomUUID(); tableIds.push(tableId);
    await client.query('INSERT INTO tables(id,name,workspace_id,columns) VALUES($1,$2,$3,$4)', [tableId, `${marker} Tasks ${tenantIndex}`, workspaceId, JSON.stringify([{ id: 'task', name: 'Task', type: 'Text' }, { id: 'status', name: 'Status', type: 'Status' }])]);
    const taskCount = taskCounts[tenantIndex - 1];
    for (let offset = 0; offset < taskCount; offset += 500) {
      const values = []; const params = [];
      for (let index = offset; index < Math.min(offset + 500, taskCount); index += 1) { values.push(`($${params.length + 1},$${params.length + 2},$${params.length + 3},$${params.length + 4},NOW(),NOW())`); params.push(randomUUID(), tableId, JSON.stringify({ task: `${marker} tenant ${tenantIndex} task ${index}`, status: index % 2 ? 'Todo' : 'Done' }), userId); }
      await client.query(`INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) VALUES ${values.join(',')}`, params);
    }
    tenants.push({ userId, workspaceId, email });
  }
  await client.query('COMMIT');
  const envFile = process.env.GITHUB_ENV;
  if (envFile) await import('node:fs/promises').then(({ appendFile }) => appendFile(envFile, `EGRESS_MEASURE_EMAILS=${tenants.map(({ email }) => email).join(',')}\nEGRESS_MEASURE_TABLE_IDS=${tableIds.join(',')}\n`));
  console.log(JSON.stringify({ syntheticTenants: tenants.length, taskCounts, markerPrefix: marker.slice(0, 18) }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally { client.release(); await pool.end(); }
