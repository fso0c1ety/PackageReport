import { randomUUID } from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const password = process.env.EGRESS2_PASSWORD || 'Egress2CiOnlyPasswordA1!';
const marker = `TEST_EGRESS2_${process.env.EGRESS2_RUN_ID || randomUUID()}`;
const sizes = [100, 1000, 5000, 10000];
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

const realisticValues = (index) => ({
  task: `${marker} task ${index}`,
  status: index % 3 === 0 ? 'Done' : 'In Progress',
  date: `2026-09-${String((index % 28) + 1).padStart(2, '0')}`,
  amount: index * 17.25,
  person: [{ id: `person-${index % 8}`, name: `Demo Person ${index % 8}` }],
  notes: 'Synthetic EGRESS-2 benchmark row; no customer data.',
});

async function seed() {
  const client = await pool.connect();
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 4);
  const tableIds = [];
  try {
    await client.query('BEGIN');
    // The deliberately minimal benchmark schema predates the optional
    // verification timestamp used by the login path. Keep this compatibility
    // column local to the disposable benchmark database.
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ');
    await client.query('INSERT INTO users(id,name,email,password,email_verified_at) VALUES($1,$2,$3,$4,NOW())', [userId, marker, `${marker.toLowerCase()}@example.test`, passwordHash]);
    await client.query('INSERT INTO workspaces(id,name,owner_id) VALUES($1,$2,$3)', [workspaceId, marker, userId]);
    await client.query('INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3)', [workspaceId, userId, 'owner']);
    for (const size of sizes) {
      const tableId = randomUUID();
      tableIds.push(tableId);
      await client.query('INSERT INTO tables(id,name,workspace_id,columns) VALUES($1,$2,$3,$4)', [tableId, `${marker}_${size}`, workspaceId, JSON.stringify([{ id: 'task', name: 'Task', type: 'Text' }, { id: 'status', name: 'Status', type: 'Status' }, { id: 'date', name: 'Date', type: 'Date' }, { id: 'amount', name: 'Amount', type: 'Numbers' }, { id: 'person', name: 'Person', type: 'People' }])]);
      for (let offset = 0; offset < size; offset += 500) {
        const values = [];
        const params = [];
        for (let index = offset; index < Math.min(offset + 500, size); index += 1) {
          const rowId = randomUUID();
          values.push(`($${params.length + 1},$${params.length + 2},$${params.length + 3},$${params.length + 4},NOW(),NOW())`);
          params.push(rowId, tableId, JSON.stringify(realisticValues(index)), userId);
        }
        await client.query(`INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) VALUES ${values.join(',')}`, params);
      }
    }
    await client.query('COMMIT');
    return { userId, workspaceId, tableIds };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function login(email) {
  const response = await fetch(`${baseUrl}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`login failed (${response.status})`);
  const cookie = response.headers.get('set-cookie');
  if (!cookie) throw new Error('login did not return a session cookie');
  return cookie.split(';', 1)[0];
}

async function measure(tableId, cookie, size) {
  let offset = 0;
  let requests = 0;
  let bytes = 0;
  const firstPageBytes = [];
  const started = performance.now();
  while (offset < size) {
    const limit = offset === 0 ? 100 : 500;
    const response = await fetch(`${baseUrl}/api/tables/${tableId}/tasks?limit=${limit}&offset=${offset}`, { headers: { cookie } });
    if (!response.ok) throw new Error(`tasks failed (${response.status})`);
    const text = await response.text();
    requests += 1;
    bytes += Buffer.byteLength(text);
    if (offset === 0) firstPageBytes.push(Buffer.byteLength(text));
    const page = JSON.parse(text);
    const rows = Array.isArray(page) ? page : page.rows || [];
    if (!rows.length) break;
    offset += rows.length;
    if (process.env.EGRESS2_MODE === 'initial') break;
  }
  return { size, requests, rows: offset, firstPageBytes: firstPageBytes[0] || 0, automaticBytes: bytes, durationMs: Math.round(performance.now() - started) };
}

const seeded = await seed();
const email = `${marker.toLowerCase()}@example.test`;
const cookie = await login(email);
const results = [];
for (let index = 0; index < sizes.length; index += 1) results.push(await measure(seeded.tableIds[index], cookie, sizes[index]));
console.log(JSON.stringify({ marker, results }, null, 2));
await pool.query('DELETE FROM workspaces WHERE id=$1', [seeded.workspaceId]);
await pool.end();
