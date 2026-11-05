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
    // Column types/nullability/defaults observed through read-only Production
    // metadata. Synthetic rows only; this is not a customer-data restore.
    await client.query(`CREATE TEMP TABLE automation_runs(id TEXT PRIMARY KEY,automation_id TEXT,table_id TEXT,row_id TEXT,idempotency_key TEXT UNIQUE,status TEXT NOT NULL DEFAULT 'pending',error_message TEXT,started_at TIMESTAMPTZ,finished_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT now(),trigger_type TEXT,input JSONB DEFAULT '{}',actions JSONB DEFAULT '[]',output JSONB DEFAULT '{}',attempt INTEGER DEFAULT 1,max_attempts INTEGER DEFAULT 3)`);
    await client.query("INSERT INTO automation_runs(id,automation_id) VALUES('legacy-preserved','1')");
    const params = ['run-1','1','table-1','row-1','delivery-1','date_arrives','{}','[]',new Date('2026-01-01T00:00:00Z')];
    await client.query('SAVEPOINT legacy_probe');
    await assert.rejects(client.query(sql, params), { code: '42703' });
    await client.query('ROLLBACK TO SAVEPOINT legacy_probe');
    await client.query('SAVEPOINT minimal_repair');
    // Apply the proposed operation to the temporary equivalent, never public.
    const operation=fs.readFileSync('server/db/operations/20261105_scheduled_for_only.sql','utf8');
    assert.equal((operation.match(/ALTER TABLE public\.automation_runs/g)||[]).length,1);
    await client.query(operation.replace('ALTER TABLE public.automation_runs','ALTER TABLE pg_temp.automation_runs'));
    assert.equal((await client.query(sql,params)).rowCount,1);
    assert.equal((await client.query(sql,params)).rowCount,0);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM automation_runs WHERE id='legacy-preserved'")).rows[0].n,1);
    await client.query('ROLLBACK TO SAVEPOINT minimal_repair');
    assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_attribute WHERE attrelid='pg_temp.automation_runs'::regclass AND attname='scheduled_for' AND NOT attisdropped")).rows[0].n,0);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM automation_runs')).rows[0].n,1);
    await client.query(fs.readFileSync('server/db/migrations/044_automation_runtime_schema.sql','utf8'));
    const first = await client.query(sql,params);
    assert.equal(first.rowCount,1);
    assert.equal((await client.query(sql,params)).rowCount,0);
    const result = {environment:'ISOLATED SYNTHETIC POSTGRESQL',query:'Exact scheduled automation claim SQL extracted from release source',withoutScheduledFor:{compatible:false,sqlstate:'42703'},minimalRepair:{claim:true,duplicatePrevented:true,legacyRowPreserved:true,rollbackColumnAndInsertedRun:true},after044:{claim:true,duplicatePrevented:true},productionModified:false,productionCompatibility:'BLOCKED if scheduled_for is absent; this test does not verify current Production catalog',delivery:'NOT TESTED'};
    fs.mkdirSync('artifacts/scheduler-compatibility',{recursive:true});
    fs.writeFileSync('artifacts/scheduler-compatibility/result.json',JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
    await client.query('ROLLBACK');
  } finally { await client.end(); }
})().catch(error => { console.error(error); process.exitCode=1; });
