const test=require('node:test'), assert=require('node:assert/strict');
const {inventory}=require('../scripts/manual-migrations.cjs');
const {checksum}=require('../server/db/migrationUtils');
const {REPAIR_ORDER,FORWARD_ORDER,validateReconciledPlan}=require('../scripts/reconciled-repair-plan.cjs');
function fixture() {
  const files=inventory();
  const rows=[...files.filter(f=>!REPAIR_ORDER.includes(f.filename)&&!FORWARD_ORDER.includes(f.filename)).slice(0,9).map(f=>({filename:f.filename,checksum:null})),...REPAIR_ORDER.map(filename=>({filename,checksum:files.find(f=>f.filename===filename).checksum}))];
  const manifest={version:2,mode:'dependent-forward-preserve-history',releaseSha:'a'.repeat(40),projectRef:'gxzvlsukjodbarlcjyys',schemaHash:checksum('schema'),backupSha256:checksum('synthetic-backup-attestation'),windowStart:new Date(Date.now()-60000).toISOString(),windowEnd:new Date(Date.now()+60000).toISOString(),originalLedger:structuredClone(rows),preserveNullChecksums:rows.filter(r=>r.checksum===null).map(r=>r.filename),inventory:files.map(({filename,checksum})=>({filename,checksum})),dependencies:REPAIR_ORDER.map(filename=>({filename,checksum:files.find(f=>f.filename===filename).checksum})),unverifiedLegacy:files.filter(f=>!rows.some(r=>r.filename===f.filename)&&!FORWARD_ORDER.includes(f.filename)).map(f=>({filename:f.filename,execution:'unknown',action:'do-not-replay',evidence:'Synthetic isolated fixture only; not a Production applied claim.'}))};
  const env={APPROVED_SHA:manifest.releaseSha,RECONCILED_REPAIR_APPROVED:'1',FORWARD_REPAIR_APPROVED:'1',MAINTENANCE_WINDOW_APPROVED:'1',EXPECTED_PROJECT_REF:manifest.projectRef,VERIFIED_BACKUP_SHA256:manifest.backupSha256,EXPECTED_RECONCILIATION_HASH:checksum(JSON.stringify(manifest)),EXPECTED_PLAN_HASH:checksum(JSON.stringify(FORWARD_ORDER.map(filename=>({filename,checksum:files.find(f=>f.filename===filename).checksum}))))};
  return {files,rows,manifest,env};
}
test('forward plan preserves nine NULLs, depends on actual prior repair entries, and leaves old plan immutable',()=>{
  const f=fixture(), before=JSON.stringify(f.rows);
  assert.deepEqual(validateReconciledPlan(f.files,f.rows,f.manifest,f.env,f.manifest.schemaHash).map(f=>f.filename),FORWARD_ORDER);
  assert.equal(JSON.stringify(f.rows),before);assert.equal(REPAIR_ORDER[0],'043_existing_schema_compatibility.sql');
});
for(const [name,mutate] of Object.entries({
  missingDependency:f=>f.rows.pop(),
  wrongDependencyChecksum:f=>f.rows.at(-1).checksum=null,
  replay:f=>f.rows.push({filename:FORWARD_ORDER[0],checksum:f.files.find(x=>x.filename===FORWARD_ORDER[0]).checksum}),
  staleApproval:f=>f.manifest.windowEnd=new Date(Date.now()-1).toISOString(),
  schemaDrift:f=>f.manifest.schemaHash=checksum('different'),
  planDrift:f=>f.env.EXPECTED_PLAN_HASH='0'.repeat(64),
  ledgerDrift:f=>f.manifest.originalLedger[0].checksum=checksum('rewritten'),
  shaDrift:f=>f.env.APPROVED_SHA='b'.repeat(40),
  projectDrift:f=>f.env.EXPECTED_PROJECT_REF='another-project',
  backupMissing:f=>delete f.env.VERIFIED_BACKUP_SHA256,
  windowNotApproved:f=>delete f.env.MAINTENANCE_WINDOW_APPROVED,
  forwardNotApproved:f=>delete f.env.FORWARD_REPAIR_APPROVED,
})) test('forward refuses '+name,()=>{const f=fixture(),schema=f.manifest.schemaHash;mutate(f);f.env.EXPECTED_RECONCILIATION_HASH=checksum(JSON.stringify(f.manifest));assert.throws(()=>validateReconciledPlan(f.files,f.rows,f.manifest,f.env,schema));});
