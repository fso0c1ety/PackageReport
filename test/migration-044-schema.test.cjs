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
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
});
