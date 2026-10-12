const test = require('node:test');
const assert = require('node:assert/strict');
const { config, inventory, ledgerHash, apply } = require('../scripts/manual-migrations.cjs');
const { checksum } = require('../server/db/migrationUtils');
const base = { MIGRATION_EXECUTION_APPROVED:'1', MANUAL_MIGRATIONS_ENABLED:'1', APPROVED_SHA:'a'.repeat(40), CHECKED_OUT_SHA:'a'.repeat(40), EXPECTED_PLAN_HASH:'b'.repeat(64), EXPECTED_LEDGER_HASH:'c'.repeat(64), DATABASE_URL:'postgresql://test:fictional@127.0.0.1:5432/smart_manage_manual_test', EXPECTED_DB_HOST:'127.0.0.1',EXPECTED_DB_PORT:'5432',EXPECTED_DB_NAME:'smart_manage_manual_test',EXPECTED_DB_USER:'test',MIGRATION_LOCAL_TEST:'1' };
test('manual configuration rejects absent approval, destination and hashes before connection', () => {
  for (const key of Object.keys(base).filter(k => !['MIGRATION_LOCAL_TEST'].includes(k))) assert.throws(() => config({...base,[key]:undefined}), key);
  assert.equal(config(base).ssl,false);
  assert.throws(() => config({...base,DATABASE_URL:'postgresql://test:fictional@production.invalid:5432/smart_manage_manual_test'}));
  assert.throws(() => config({...base,CHECKED_OUT_SHA:'d'.repeat(40)}));
  assert.throws(() => config({...base,MIGRATION_TARGET:'013_template_marketplace.sql'}));
  assert.throws(() => config({...base,MIGRATION_LOCAL_TEST:undefined}));
});
function mock(rows, {lock=true,ledger=true,failSql=false}={}) {
  const calls=[]; const state=rows.map(r=>({...r}));
  return {calls,query:async(sql,params)=>{
    calls.push(sql);
    if(sql.includes('pg_try_advisory_lock')) return {rows:[{acquired:lock}]};
    if(sql.includes('current_database')) return {rows:[{database:'smart_manage_manual_test',username:'test'}]};
    if(sql.includes('to_regclass')) return {rows:[{ledger:ledger?'schema_migrations':null}]};
    if(sql.startsWith('SELECT filename')) return {rows:state.map(r=>({...r}))};
    if(sql.startsWith('INSERT INTO public.schema_migrations')) state.push({filename:params[0],checksum:params[1]});
    if(failSql && sql.includes('CREATE TABLE')) throw new Error('do not expose SQL');
    return {rows:[]};
  }};
}
const all=inventory().map(({filename,checksum})=>({filename,checksum}));
test('manual runner rejects lock conflicts, missing ledger, modified checksums and stale approved plan without writes',async()=>{
  for(const [rows,options] of [[all,{lock:false}],[all,{ledger:false}],[[{...all[0],checksum:'invalid'}],{}],[all,{}]]) {
    const c=mock(rows,options); await assert.rejects(()=>apply(c,base)); assert.equal(c.calls.includes('BEGIN'),false);
  }
});
test('already migrated database requires matching approved ledger and performs zero migrations',async()=>{
  const c=mock(all); const result=await apply(c,{...base,EXPECTED_LEDGER_HASH:ledgerHash(all),EXPECTED_PLAN_HASH:checksum('[]')});
  assert.deepEqual(result.applied,[]); assert.equal(c.calls.includes('BEGIN'),false);
});
test('pending migration uses a transaction and preserves historic checksums',async()=>{
  const rows=all.slice(0,-1);const c=mock(rows); const result=await apply(c,{...base,EXPECTED_LEDGER_HASH:ledgerHash(rows),EXPECTED_PLAN_HASH:checksum(JSON.stringify(all.slice(-1)))});
  assert.equal(result.applied.length,1);assert.ok(c.calls.includes('COMMIT'));
});
test('SQL failure rolls back and releases advisory lock',async()=>{
  const rows=all.slice(0,-1);const c=mock(rows,{failSql:true});
  await assert.rejects(()=>apply(c,{...base,EXPECTED_LEDGER_HASH:ledgerHash(rows),EXPECTED_PLAN_HASH:checksum(JSON.stringify(all.slice(-1)))}));
  assert.ok(c.calls.includes('ROLLBACK'));assert.ok(c.calls.some(s=>s.includes('pg_advisory_unlock')));
});
