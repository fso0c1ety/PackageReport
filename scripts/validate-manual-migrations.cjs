const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { config, inventory, ledgerHash, apply } = require('./manual-migrations.cjs');
const { checksum } = require('../server/db/migrationUtils');
async function main() {
  assert.equal(process.env.MIGRATION_LOCAL_TEST, '1');
  const env={...process.env, APPROVED_SHA:'a'.repeat(40),CHECKED_OUT_SHA:'a'.repeat(40),EXPECTED_PLAN_HASH:'b'.repeat(64),EXPECTED_LEDGER_HASH:'c'.repeat(64),MIGRATION_EXECUTION_APPROVED:'1',MANUAL_MIGRATIONS_ENABLED:'1'};
  const options=config(env);
  const { Client }=require('pg');const c=new Client(options);await c.connect();
  try {
    const version=await c.query('SHOW server_version_num');assert.equal(Math.floor(Number(version.rows[0].server_version_num)/10000),16);
    assert.equal((await c.query("SELECT to_regclass('schema_migrations') AS ledger")).rows[0].ledger,null);
    await assert.rejects(()=>apply(c,env),/Existing migration ledger required/);
    execFileSync(process.execPath,['server/db/runMigrations.js'],{env:{...process.env,MIGRATION_TARGET:'000_legacy_base_schema.sql,001_core_saas_schema.sql'},stdio:'inherit'});
    await c.query("INSERT INTO users(id,name,email) VALUES('manual-sentinel','Local Test','manual@example.test')");
    const before=(await c.query('SELECT * FROM schema_migrations ORDER BY filename')).rows;
    await assert.rejects(()=>apply(c,env),/Approved migration plan/);
    assert.deepEqual((await c.query('SELECT * FROM schema_migrations ORDER BY filename')).rows,before);
    const pending=inventory().filter(f=>!before.some(r=>r.filename===f.filename)).map(({filename,checksum})=>({filename,checksum}));
    env.EXPECTED_LEDGER_HASH=ledgerHash(before);env.EXPECTED_PLAN_HASH=checksum(JSON.stringify(pending));
    const result=await apply(c,env);assert.equal(result.verified,inventory().length);
    const complete=(await c.query('SELECT * FROM schema_migrations ORDER BY filename')).rows;
    env.EXPECTED_LEDGER_HASH=ledgerHash(complete);env.EXPECTED_PLAN_HASH=checksum('[]');
    assert.deepEqual((await apply(c,env)).applied,[]);
    assert.deepEqual((await c.query('SELECT * FROM schema_migrations ORDER BY filename')).rows,complete);
    assert.equal((await c.query("SELECT id FROM users WHERE id='manual-sentinel'")).rowCount,1);
    const other=new Client(options);await other.connect();
    try { await other.query('SELECT pg_advisory_lock(1182026)');await assert.rejects(()=>apply(c,env),/Another migration session/); }
    finally { await other.query('SELECT pg_advisory_unlock(1182026)');await other.end(); }
    console.log(JSON.stringify({postgres:16,verified:result.verified,missingLedgerRefused:true,stalePlanRefused:true,concurrentRunRefused:true,rerunPreserved:true}));
  } finally {await c.end();}
}
main().catch(()=>{console.error('Isolated manual migration validation failed');process.exitCode=1;});
