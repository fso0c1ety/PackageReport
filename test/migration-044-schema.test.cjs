const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const fs = require('node:fs');

test('migration 044 is idempotent and preserves legacy automation rows', async (t) => {
  const url = process.env.DATABASE_URL;
  if (!url) return t.skip('DATABASE_URL is required for isolated PostgreSQL integration');
  const parsed = new URL(url);
  assert.ok(['127.0.0.1', 'localhost'].includes(parsed.hostname));
  assert.match(parsed.pathname, /test/);
  const client = new Client({ connectionString: url, ssl: false });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("CREATE TEMP TABLE automations(id SERIAL PRIMARY KEY, table_id TEXT)");
    await client.query("INSERT INTO automations(table_id) VALUES ('synthetic')");
    await client.query("CREATE TEMP TABLE automation_runs(id TEXT PRIMARY KEY, automation_id TEXT)");
    const migration = fs.readFileSync('server/db/migrations/044_automation_runtime_schema.sql', 'utf8');
    assert.equal(require('node:crypto').createHash('sha256').update(migration.replace(/\r\n/g, '\n')).digest('hex'), 'c6c6b14ad25235d0c25f15dcb097975548cfdefbe2e1b0ac47592747e9ceda10');
    await client.query("INSERT INTO automation_runs(id,automation_id) VALUES ('existing-run','1')");
    await client.query(migration);
    await client.query(migration);
    const row = await client.query('SELECT id, table_id FROM automations');
    assert.deepEqual(row.rows, [{ id: 1, table_id: 'synthetic' }]);
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid = to_regclass('pg_temp.automation_runs')
          AND attname = 'scheduled_for'
          AND NOT attisdropped
      ) AS present
    `);
    assert.equal(result.rows[0].present, true);
    assert.deepEqual((await client.query('SELECT id,automation_id FROM automation_runs')).rows,[{id:'existing-run',automation_id:'1'}]);
    assert.equal((await client.query("SELECT format_type(atttypid,atttypmod) AS type FROM pg_attribute WHERE attrelid='pg_temp.automations'::regclass AND attname='id'")).rows[0].type,'integer');
    await client.query("INSERT INTO automations(table_id) VALUES ('second')");
    assert.equal((await client.query("SELECT id FROM automations WHERE table_id='second'")).rows[0].id,2);
    await client.query("INSERT INTO automation_runs(id,automation_id,idempotency_key,scheduled_for) VALUES ('retry','1','unique-delivery','2026-10-25T01:30:00Z')");
    await client.query('SAVEPOINT duplicate_delivery');
    await assert.rejects(client.query("INSERT INTO automation_runs(id,automation_id,idempotency_key) VALUES ('duplicate','1','unique-delivery')"),{code:'23505'});
    await client.query('ROLLBACK TO SAVEPOINT duplicate_delivery');
    assert.equal((await client.query("SELECT count(*)::int AS count FROM automation_runs WHERE scheduled_for<='2026-10-25T02:00:00Z'")).rows[0].count,1);
    fs.mkdirSync('artifacts/migration-044',{recursive:true});
    fs.writeFileSync('artifacts/migration-044/preservation.json',JSON.stringify({classification:'ISOLATED_SYNTHETIC_POSTGRESQL',legacyIntegerIDs:true,existingRunPreserved:true,sequencePreserved:true,repeatApplication:true,idempotencyConstraint:true,scheduledTimestampQuery:true,applicationSchedulerDelivery:'NOT TESTED BY THIS SQL TEST'},null,2));
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
});
