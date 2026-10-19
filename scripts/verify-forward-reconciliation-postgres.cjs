const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Client}=require('pg');
const {inventory,ledgerHash,apply}=require('./manual-migrations.cjs');
const {REPAIR_ORDER,FORWARD_ORDER,schemaEvidenceHash}=require('./reconciled-repair-plan.cjs');
const {checksum}=require('../server/db/migrationUtils');
async function main(){
  const url=new URL(process.env.DATABASE_URL);
  assert(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname.includes('test'),'Isolated test destination required');
  const db=new Client({connectionString:url.toString(),ssl:false});await db.connect();
  try{
    const files=inventory();
    await db.query('CREATE SCHEMA IF NOT EXISTS extensions; CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions');
    const cryptoSchema=(await db.query("SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto'")).rows[0]?.nspname;
    if(cryptoSchema!=='extensions')await db.query('ALTER EXTENSION pgcrypto SET SCHEMA extensions');
    // This database is disposable CI data, never a restored customer database.
    await db.query('DELETE FROM public.schema_migrations WHERE filename=ANY($1::text[])',[FORWARD_ORDER]);
    const historical=(await db.query('SELECT filename FROM public.schema_migrations ORDER BY filename')).rows.filter(r=>!REPAIR_ORDER.includes(r.filename)).slice(0,9);
    assert.equal(historical.length,9);
    await db.query('UPDATE public.schema_migrations SET checksum=NULL WHERE filename=ANY($1::text[])',[historical.map(r=>r.filename)]);
    const before=(await db.query('SELECT filename,checksum FROM public.schema_migrations')).rows;
    const schemaHash=await schemaEvidenceHash(db);
    const manifest={version:2,mode:'dependent-forward-preserve-history',releaseSha:'a'.repeat(40),projectRef:'gxzvlsukjodbarlcjyys',schemaHash,backupSha256:checksum('synthetic-attestation-not-production-backup'),windowStart:new Date(Date.now()-1000).toISOString(),windowEnd:new Date(Date.now()+10*60*1000).toISOString(),originalLedger:before,preserveNullChecksums:before.filter(r=>r.checksum===null).map(r=>r.filename),inventory:files.map(({filename,checksum})=>({filename,checksum})),dependencies:REPAIR_ORDER.map(filename=>({filename,checksum:files.find(f=>f.filename===filename).checksum})),unverifiedLegacy:files.filter(f=>!before.some(r=>r.filename===f.filename)&&!FORWARD_ORDER.includes(f.filename)).map(f=>({filename:f.filename,execution:'unknown',action:'do-not-replay',evidence:'Disposable synthetic CI database; not evidence of Production history.'}))};
    const env={EXPECTED_DB_NAME:decodeURIComponent(url.pathname.slice(1)),EXPECTED_DB_USER:decodeURIComponent(url.username),APPROVED_SHA:manifest.releaseSha,EXPECTED_PROJECT_REF:manifest.projectRef,RECONCILED_REPAIR_APPROVED:'1',FORWARD_REPAIR_APPROVED:'1',MAINTENANCE_WINDOW_APPROVED:'1',VERIFIED_BACKUP_SHA256:manifest.backupSha256,EXPECTED_LEDGER_HASH:ledgerHash(before),RECONCILIATION_MANIFEST:JSON.stringify(manifest),EXPECTED_RECONCILIATION_HASH:checksum(JSON.stringify(manifest)),EXPECTED_PLAN_HASH:checksum(JSON.stringify(FORWARD_ORDER.map(filename=>({filename,checksum:files.find(f=>f.filename===filename).checksum}))))};
    const failing={query:async(...args)=>{const result=await db.query(...args);if(args[0]===files.find(f=>f.filename===FORWARD_ORDER[2]).sql)throw Error('Injected after actual 046 SQL execution');return result;}};
    await assert.rejects(()=>apply(failing,env));
    assert.equal(ledgerHash((await db.query('SELECT filename,checksum FROM public.schema_migrations')).rows),ledgerHash(before));
    assert.equal(await schemaEvidenceHash(db),schemaHash);
    const result=await apply(db,env);assert.deepEqual(result.applied,FORWARD_ORDER);assert.equal(result.preservedNullChecksums,9);
    await assert.rejects(()=>apply(db,env));
    const after=(await db.query('SELECT filename,checksum FROM public.schema_migrations')).rows;
    for(const old of before)assert.equal(after.find(r=>r.filename===old.filename).checksum,old.checksum);
    fs.mkdirSync('artifacts/forward-reconciliation',{recursive:true});fs.writeFileSync('artifacts/forward-reconciliation/results.json',JSON.stringify({classification:'MEASURED_ISOLATED_POSTGRESQL',applied:result.applied,preservedNullChecksums:9,realSqlFailureRollback:true,schemaRestoredAfterFailure:true,replayRefused:true,productionBackupVerified:false,restoredCopyTest:'NOT RUN; synthetic database only'},null,2));
  }finally{await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
