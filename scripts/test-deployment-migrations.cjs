const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { checksum } = require('../server/db/migrationUtils');

async function main() {
  assert.equal(process.env.DEPLOYMENT_SAFETY_TEST, '1');
  const url = new URL(process.env.DATABASE_URL || '');
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(url.hostname));
  assert.equal(url.pathname, '/smart_manage_safety_test');
  assert.ok(!process.env.MIGRATION_TARGET);
  const scenario = process.env.SAFETY_SCENARIO;
  assert.ok(['fresh', 'existing', 'partial-013', 'partial-032', 'production-target-fresh'].includes(scenario));
  const files = fs.readdirSync('server/db/migrations').filter(f => f.endsWith('.sql')).sort();
  const client = new Client({ connectionString: url.toString(), ssl: false });
  await client.connect();
  try {
    const version = await client.query('SHOW server_version_num');
    assert.equal(Math.floor(Number(version.rows[0].server_version_num) / 10000), 16);
    assert.equal((await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount, 0);
    function migrate(target) {
      const env = { ...process.env };
      delete env.MIGRATION_TARGET;
      if (target) env.MIGRATION_TARGET = target;
      return spawnSync(process.execPath, ['server/db/runMigrations.js'], { env, encoding: 'utf8' });
    }
    function requireSuccess(result) {
      if (result.status !== 0) throw new Error(result.stdout + result.stderr);
    }
    if (scenario === 'production-target-fresh') {
      const source = fs.readFileSync('scripts/vercel-build.js', 'utf8');
      const target = source.match(/MIGRATION_TARGET: '([^']+)'/)?.[1];
      assert.ok(target, 'production allowlist must be identified');
      const result = migrate(target);
      assert.notEqual(result.status, 0, 'current production allowlist is expected to lack base schema');
      assert.match(result.stdout + result.stderr, /users.*does not exist|relation.*users/);
      console.log(JSON.stringify({ scenario, expectedFailureConfirmed: true, error: '020 requires users; production allowlist is not a fresh installer' }));
      return;
    }
    if (scenario.startsWith('partial-')) {
      const cutoff = scenario === 'partial-013' ? '012a_marketplace_base.sql' : '031a_calendar_events_base.sql';
      requireSuccess(migrate(files.filter(f => f < cutoff).join(',')));
    }
    requireSuccess(migrate());
    await client.query("INSERT INTO users(id,name,email) VALUES('safety-user','Test User','safety@example.test')");
    await client.query("INSERT INTO marketplace_templates(id,name,author_id) VALUES('safety-template','Keep this','safety-user')");
    const before = (await client.query('SELECT * FROM schema_migrations ORDER BY filename')).rows;
    const dataBefore = (await client.query("SELECT * FROM marketplace_templates WHERE id='safety-template'")).rows;
    requireSuccess(migrate());
    const after = (await client.query('SELECT * FROM schema_migrations ORDER BY filename')).rows;
    assert.deepEqual(after, before);
    assert.deepEqual((await client.query("SELECT * FROM marketplace_templates WHERE id='safety-template'")).rows, dataBefore);
    assert.deepEqual(after.map(r => r.filename), files);
    for (const row of after) assert.equal(row.checksum, checksum(fs.readFileSync(`server/db/migrations/${row.filename}`, 'utf8')));
    console.log(JSON.stringify({ scenario, migrations: after.length, checksumsPreserved: true, dataPreserved: true, rerun: 'PASS' }));
  } finally { await client.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
