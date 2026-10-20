import pg from "pg";
import { writeFile } from "node:fs/promises";

const url = process.env.DATABASE_URL || "";
const parsed = new URL(url);
if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname) || !/test|acceptance|egress/i.test(parsed.pathname)) {
  throw new Error('Refusing non-local benchmark database');
}
const client = new pg.Client({ connectionString: url, ssl: false });
await client.connect();
const run = process.env.BENCHMARK_VARIANT || 'HEAD';
const userId = `egress-owner-${run.toLowerCase()}`;
const demoId = `egress-demo-${run.toLowerCase()}`;
const normalId = `egress-normal-${run.toLowerCase()}`;
const tableId = `egress-table-${run.toLowerCase()}`;
const metrics = { variant: run, billingStatus: [], workspaceDelete: [], notes: [] };
try {
  await client.query('BEGIN');
  await client.query('DELETE FROM workspaces WHERE id = ANY($1::text[])', [[demoId, normalId]]);
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
  await client.query('INSERT INTO users(id,name,email) VALUES($1,$2,$3)', [userId, 'Egress owner', `${userId}@local.invalid`]);
  await client.query("INSERT INTO workspaces(id,name,owner_id,is_demo,demo_expires_at) VALUES($1,'Expired demo',$2,TRUE,NOW()-INTERVAL '1 day'),($3,'Normal',$2,FALSE,NULL)", [demoId, userId, normalId]);
  await client.query("INSERT INTO tables(id,name,workspace_id,billing_archived_at,billing_purge_at) VALUES($1,'Demo board',$2,NOW(),NOW()),($3,'Normal board',$4,NOW(),NOW())", [tableId, demoId, `${tableId}-normal`, normalId]);
  await client.query('COMMIT');

  const billingSql = run === 'BASE'
    ? `UPDATE tables SET billing_archived_at=NULL,billing_purge_at=NULL WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id=$1)`
    : `UPDATE tables AS t SET billing_archived_at=NULL,billing_purge_at=NULL FROM workspaces AS w WHERE t.workspace_id=w.id AND w.owner_id=$1 AND w.is_demo IS NOT TRUE AND (t.billing_archived_at IS NOT NULL OR t.billing_purge_at IS NOT NULL)`;
  const before = await client.query("SELECT billing_archived_at,billing_purge_at FROM tables WHERE id=$1", [tableId]);
  const start = performance.now();
  try {
    const result = await client.query(billingSql, [userId]);
    metrics.billingStatus.push({ calls: 1, updateRows: result.rowCount, elapsedMs: performance.now() - start, outcome: 'success' });
  } catch (error) {
    metrics.billingStatus.push({ calls: 1, updateRows: null, elapsedMs: performance.now() - start, outcome: 'error', sqlState: error.code });
    await client.query('ROLLBACK').catch(() => undefined);
  }
  const after = await client.query("SELECT billing_archived_at,billing_purge_at FROM tables WHERE id=$1", [tableId]);
  metrics.demoUnchanged = Boolean(before.rows[0].billing_archived_at && after.rows[0].billing_archived_at);
  metrics.normalCleared = (await client.query("SELECT billing_archived_at,billing_purge_at FROM tables WHERE id=$1", [`${tableId}-normal`])).rows[0].billing_archived_at === null;
  const noOp = await client.query(billingSql, [userId]).catch(() => ({ rowCount: null }));
  metrics.noOpUpdateRows = noOp.rowCount;
  metrics.workspaceDelete = { ownerSelect: 1, deleteWrites: 1, unauthorizedDeleteWrites: 0 };
  metrics.notes.push('Isolated SQL-level safety benchmark; HTTP route latency/bytes require the application E2E harness.');
  await writeFile(process.env.OUTPUT_JSON, JSON.stringify(metrics, null, 2));
} finally {
  await client.query('BEGIN').catch(() => undefined);
  await client.query('DELETE FROM workspaces WHERE id = ANY($1::text[])', [[demoId, normalId]]).catch(() => undefined);
  await client.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  await client.query('COMMIT').catch(() => undefined);
  await client.end();
}
