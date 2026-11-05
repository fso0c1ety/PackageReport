const fs = require('node:fs');
const assert = require('node:assert/strict');
const { Client } = require('pg');

(async () => {
  const url = new URL(process.env.DATABASE_URL || '');
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/scheduler_compatibility_test');
  const source = fs.readFileSync('src/app/api/automation/due/route.js', 'utf8');
  const sql = source.match(/const claim = await pool\.query\(`([\s\S]*?)`, \[randomUUID\(\)/)?.[1];
  assert(sql && sql.includes('INSERT INTO automation_runs') && sql.includes('scheduled_for'));
  const client = new Client({ connectionString: url.href, ssl: false });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE automations(id SERIAL PRIMARY KEY,table_id TEXT)');
    await client.query(`CREATE TEMP TABLE automation_runs(id TEXT PRIMARY KEY,automation_id TEXT,table_id TEXT,row_id TEXT,idempotency_key TEXT UNIQUE,trigger_type TEXT,input JSONB,actions JSONB,status TEXT,started_at TIMESTAMPTZ,finished_at TIMESTAMPTZ,error_message TEXT)`);
    const params = ['run-1','1','table-1','row-1','delivery-1','date_arrives','{}','[]',new Date('2026-01-01T00:00:00Z')];
    await client.query('SAVEPOINT legacy_probe');
    await assert.rejects(client.query(sql, params), { code: '42703' });
    await client.query('ROLLBACK TO SAVEPOINT legacy_probe');
    await client.query(fs.readFileSync('server/db/migrations/044_automation_runtime_schema.sql','utf8'));
    const first = await client.query(sql,params);
    assert.equal(first.rowCount,1);
    assert.equal((await client.query(sql,params)).rowCount,0);
    const result = {environment:'ISOLATED SYNTHETIC POSTGRESQL',query:'Exact scheduled automation claim SQL extracted from release source',withoutScheduledFor:{compatible:false,sqlstate:'42703'},after044:{claim:true,duplicatePrevented:true},productionModified:false,productionCompatibility:'BLOCKED if scheduled_for is absent; this test does not verify current Production catalog',delivery:'NOT TESTED'};
    fs.mkdirSync('artifacts/scheduler-compatibility',{recursive:true});
    fs.writeFileSync('artifacts/scheduler-compatibility/result.json',JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
    await client.query('ROLLBACK');
  } finally { await client.end(); }
})().catch(error => { console.error(error); process.exitCode=1; });
