import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

const { Client } = pg;
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const password = process.env.EGRESS5_PASSWORD;
const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
const workspaceId = '55555555-5555-4555-8555-555555555555';
const driverId = 'egress5-driver-a';
const otherDriverId = 'egress5-driver-b';
const managerId = 'egress5-manager';
const matrixUserId = 'egress5-matrix-user';
const otherUserId = 'egress5-other-user';
const fuelTableId = '55555555-5555-4555-8555-555555555551';
const expenseTableId = '55555555-5555-4555-8555-555555555552';
const tripTableId = '55555555-5555-4555-8555-555555555553';
let lastSeedIds = [];
let permissionCookie = '';
const columns = [
  { id: 'date', name: 'Date' }, { id: 'trip', name: 'Trip' }, { id: 'driver', name: 'Driver' },
  { id: 'receipt', name: 'Receipt' }, { id: 'name', name: 'Name' }, { id: 'amount', name: 'Amount' },
  { id: 'description', name: 'Description' },
];

const queryCount = () => fs.existsSync(process.env.EGRESS5_QUERY_FILE || '') ? fs.readFileSync(process.env.EGRESS5_QUERY_FILE, 'utf8').trim().split(/\r?\n/).filter(Boolean).length : 0;
const queryBytes = (from) => fs.existsSync(process.env.EGRESS5_QUERY_FILE || '') ? fs.readFileSync(process.env.EGRESS5_QUERY_FILE, 'utf8').trim().split(/\r?\n/).filter(Boolean).slice(from).reduce((sum, line) => sum + Number(JSON.parse(line).resultBytes || 0), 0) : 0;
const seedRows = async (tableId, count) => {
  await db.query('DELETE FROM rows WHERE table_id=$1', [tableId]);
  lastSeedIds = [];
  for (let offset = 0; offset < count; offset += 100) {
    const values = []; const params = [];
    for (let i = offset; i < Math.min(offset + 100, count); i++) {
      const id = randomUUID();
      lastSeedIds.push(id);
      values.push(`($${params.length + 1},$${params.length + 2},$${params.length + 3}::jsonb,$${params.length + 4},NOW(),NOW())`);
      params.push(id, tableId, JSON.stringify({ _workspaceId: workspaceId, _assignedDriverUserId: String(i % 5 ? driverId : otherDriverId), date: '2026-10-01', trip: [{ id: `trip-${i}`, label: `TRIP-${i}`, tableId: tripTableId }], driver: [{ id: i % 5 ? driverId : otherDriverId, name: 'Synthetic Driver', email: 'driver@example.test' }], receipt: [{ id: `file-${i}`, name: `receipt-${i}.pdf`, url: 'https://example.test/receipt.pdf', type: 'application/pdf', size: 1024 }], name: `Synthetic record ${i}`, amount: i * 3.5, description: 'Synthetic EGRESS-5 payload benchmark row', extra: 'unused metadata '.repeat(12) }), driverId);
    }
    await db.query(`INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) VALUES ${values.join(',')}`, params);
  }
};
const login = async (email) => {
  const response = await fetch(`${baseUrl}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`login failed ${response.status}`);
  const body = await response.json();
  if (!body.token) throw new Error('login did not return a session token');
  return body.token;
};
const probeSelfTest = async (token) => {
  const before = queryCount();
  const response = await fetch(`${baseUrl}/api/logistics/driver/documents?workspaceId=${workspaceId}&category=fuel`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`EGRESS5 probe self-test request failed (${response.status})`);
  const after = queryCount();
  if (after <= before) throw new Error('EGRESS5_DB_PROBE_NOT_OBSERVING_APPLICATION_QUERIES');
  const records = fs.readFileSync(process.env.EGRESS5_QUERY_FILE, 'utf8').trim().split(/\r?\n/).filter(Boolean).slice(before).map((line) => JSON.parse(line));
  if (!records.some((entry) => Number(entry.resultBytes) > 0) || !records.some((entry) => Number(entry.rows) >= 1)) throw new Error('EGRESS5_DB_PROBE_NOT_OBSERVING_APPLICATION_QUERIES');
};
const measureGet = async (category, tableId, count, cookie) => {
  await seedRows(tableId, count);
  const before = queryCount(); const started = performance.now();
  const response = await fetch(`${baseUrl}/api/logistics/driver/documents?workspaceId=${workspaceId}&category=${category}`, { headers: { Authorization: `Bearer ${cookie}` } });
  const text = await response.text(); const after = queryCount();
  const payload = JSON.parse(text);
  return { status: response.status, queries: after - before, dbResultBytes: queryBytes(before), httpBytes: Buffer.byteLength(text), runtimeMs: Math.round(performance.now() - started), records: payload.records?.map((row) => row.id) || [], fieldCount: 0 };
};
const measurePost = async (category, cookie) => {
  const before = queryCount(); const started = performance.now();
  const response = await fetch(`${baseUrl}/api/logistics/driver/documents`, { method: 'POST', headers: { Authorization: `Bearer ${cookie}`, 'content-type': 'application/json' }, body: JSON.stringify({ workspaceId, tripId: 'egress5-trip', category, file: { id: `egress5-${category}-file`, name: `${category}.pdf`, url: 'https://example.test/file.pdf', type: 'application/pdf', size: 100 } }) });
  const text = await response.text(); const after = queryCount();
  return { status: response.status, queries: after - before, dbResultBytes: queryBytes(before), httpBytes: Buffer.byteLength(text), runtimeMs: Math.round(performance.now() - started), response: JSON.parse(text) };
};
const measurePermission = async (rowId, cookie, userId) => {
  const before = queryCount(); const started = performance.now();
  const response = await fetch(`${baseUrl}/api/egress5-benchmark/row-permission?userId=${encodeURIComponent(userId)}&rowId=${encodeURIComponent(rowId)}&required=viewer&expectedTableId=${encodeURIComponent(fuelTableId)}`, { headers: { Authorization: `Bearer ${cookie}` } });
  const text = await response.text(); const after = queryCount(); const payload = JSON.parse(text);
  if (!response.ok || after <= before) throw new Error(`requireRowPermission benchmark failed status=${response.status}`);
  return { status: response.status, queries: after - before, dbResultBytes: queryBytes(before), httpBytes: Buffer.byteLength(text), runtimeMs: Math.round(performance.now() - started), allowed: payload.allowed, rowId: payload.rowId, tableId: payload.tableId };
};
const matrixPermission = async (name, rowId, access, values, createdBy, expected) => {
  await db.query('UPDATE board_member_access SET record_access=$1::jsonb,board_role=$2 WHERE table_id=$3 AND user_id=$4', [JSON.stringify(access), access.scope === 'all_permitted' ? 'viewer' : 'editor', fuelTableId, matrixUserId]);
  await db.query('UPDATE rows SET values=$1::jsonb,created_by=$2 WHERE id=$3', [JSON.stringify(values), createdBy, rowId]);
  const result = await measurePermission(rowId, permissionCookie, matrixUserId);
  result.expectedAllowed = expected;
  if (Boolean(result.allowed) !== expected) throw new Error(`AUTH_MATRIX_MISMATCH ${name}`);
  return result;
};

await db.connect();
try {
  const hash = await bcrypt.hash(password, 4);
  await db.query("INSERT INTO users(id,name,email,password,email_verified_at) VALUES($1,$2,$3,$4,NOW()),($5,$6,$7,$4,NOW()),($8,$9,$10,$4,NOW()) ON CONFLICT(id) DO UPDATE SET password=EXCLUDED.password", [driverId, 'EGRESS5 Driver A', 'egress5-driver-a@example.test', hash, otherDriverId, 'EGRESS5 Driver B', 'egress5-driver-b@example.test', managerId, 'EGRESS5 Manager', 'egress5-manager@example.test']);
  await db.query("INSERT INTO workspaces(id,name,owner_id,template_key) VALUES($1,$2,$3,'fleet_management') ON CONFLICT(id) DO UPDATE SET template_key='fleet_management',owner_id=EXCLUDED.owner_id", [workspaceId, 'TEST_EGRESS5_DRIVER', managerId]);
  await db.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,record_access) VALUES($1,$2,'driver','driver','{"scope":"all"}'::jsonb),($1,$3,'driver','driver','{"scope":"all"}'::jsonb) ON CONFLICT DO NOTHING`, [workspaceId, driverId, otherDriverId]);
  await db.query('INSERT INTO tables(id,name,workspace_id,columns) VALUES($1,\'fuel\',$4,$3::jsonb),($2,\'expenses\',$4,$3::jsonb),($5,\'trips\',$4,$3::jsonb) ON CONFLICT(id) DO UPDATE SET columns=EXCLUDED.columns', [fuelTableId, expenseTableId, JSON.stringify(columns), workspaceId, tripTableId]);
  const cookie = await login('egress5-driver-a@example.test');
  const managerCookie = await login('egress5-manager@example.test');
  permissionCookie = managerCookie;
  await seedRows(fuelTableId, 10);
  await probeSelfTest(cookie);
  const result = { get: {}, post: {}, permission: {} };
  for (const count of [10, 100, 500]) {
    result.get[`fuel_${count}`] = await measureGet('fuel', fuelTableId, count, cookie);
    result.permission[`row_${count}`] = await measurePermission(lastSeedIds[0], managerCookie, managerId);
    result.get[`expense_${count}`] = await measureGet('expense', expenseTableId, count, cookie);
  }
  await db.query("INSERT INTO users(id,name,email,password,email_verified_at) VALUES($1,'EGRESS5 Matrix','egress5-matrix@example.test',$2,NOW()),($3,'EGRESS5 Other','egress5-other@example.test',$2,NOW()) ON CONFLICT(id) DO NOTHING", [matrixUserId, await bcrypt.hash(password, 4), otherUserId]);
  await db.query("INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,record_access,team_id,department_id,company_id) VALUES($1,$2,'member','member','{\"scope\":\"all\"}', 'team-a','dept-a','company-a') ON CONFLICT(workspace_id,user_id) DO UPDATE SET workspace_role='member',team_id='team-a',department_id='dept-a',company_id='company-a'", [workspaceId, matrixUserId]);
  await db.query("INSERT INTO board_member_access(table_id,user_id,board_role,record_access) VALUES($1,$2,'editor','{\"scope\":\"all_permitted\"}') ON CONFLICT(table_id,user_id) DO UPDATE SET board_role='editor',record_access=EXCLUDED.record_access", [fuelTableId, matrixUserId]);
  const matrixRow = lastSeedIds[0];
  result.matrix = {};
  result.matrix.owner = await matrixPermission('owner', matrixRow, { scope: 'all_permitted' }, { _workspaceId: workspaceId }, driverId, true);
  result.matrix.createdByOwn = await matrixPermission('createdByOwn', matrixRow, { scope: 'created_by_me' }, { _workspaceId: workspaceId }, matrixUserId, true);
  result.matrix.createdByOther = await matrixPermission('createdByOther', matrixRow, { scope: 'created_by_me' }, { _workspaceId: workspaceId }, otherUserId, false);
  result.matrix.selected = await matrixPermission('selected', matrixRow, { scope: 'selected_records', ids: [matrixRow] }, { _workspaceId: workspaceId }, otherUserId, true);
  result.matrix.unselected = await matrixPermission('unselected', matrixRow, { scope: 'selected_records', ids: ['not-selected'] }, { _workspaceId: workspaceId }, otherUserId, false);
  result.matrix.assigned = await matrixPermission('assigned', matrixRow, { scope: 'assigned_to_me', field: '_assignedDriverUserId' }, { _workspaceId: workspaceId, _assignedDriverUserId: matrixUserId }, otherUserId, true);
  result.matrix.notAssigned = await matrixPermission('notAssigned', matrixRow, { scope: 'assigned_to_me', field: '_assignedDriverUserId' }, { _workspaceId: workspaceId, _assignedDriverUserId: otherUserId }, otherUserId, false);
  result.matrix.myTeam = await matrixPermission('myTeam', matrixRow, { scope: 'my_team', field: 'teamId' }, { _workspaceId: workspaceId, teamId: 'team-a' }, otherUserId, true);
  result.matrix.otherTeam = await matrixPermission('otherTeam', matrixRow, { scope: 'my_team', field: 'teamId' }, { _workspaceId: workspaceId, teamId: 'team-b' }, otherUserId, false);
  result.matrix.expectedTableMismatch = await measurePermission(matrixRow, managerCookie, matrixUserId);
  result.matrix.expectedTableMismatch.expectedAllowed = false;
  const trip = 'egress5-trip'; await db.query('INSERT INTO rows(id,table_id,values,created_by) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(id) DO UPDATE SET values=EXCLUDED.values', [trip, tripTableId, JSON.stringify({ _workspaceId: workspaceId, _assignedDriverUserId: driverId, name: 'egress5-trip' }), driverId]);
  result.post.trip = await measurePost('trip', cookie); result.post.fuel = await measurePost('fuel', cookie); result.post.expense = await measurePost('expense', cookie);
  console.log(JSON.stringify(result, null, 2));
} finally { await db.end(); }
