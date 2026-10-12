const test=require('node:test');const assert=require('node:assert/strict');
const {compare}=require('../scripts/database-identity-audit.cjs');
const identities=['production','preview','development'].map((environment,i)=>({environment,DATABASE_URL:`postgresql://user:DO_NOT_PRINT@database${i}.invalid:5432/postgres`,NEXT_PUBLIC_SUPABASE_URL:`https://project${i}.supabase.co`}));
test('offline identity audit never reports URLs or credentials',()=>{const report=compare(identities,'k'.repeat(32));assert.equal(report.liveDatabaseIdentityVerified,false);assert.ok(report.comparisons.every(r=>!r.sharedSupabaseProject&&!r.possiblySharedDatabaseEndpoint));assert.equal(JSON.stringify(report).includes('DO_NOT_PRINT'),false);assert.equal(JSON.stringify(report).includes('database0'),false);});
test('shared project or database endpoint is flagged',()=>{const same=identities.map(r=>({...r}));same[1].DATABASE_URL=same[0].DATABASE_URL;same[2].NEXT_PUBLIC_SUPABASE_URL=same[0].NEXT_PUBLIC_SUPABASE_URL;const report=compare(same,'k'.repeat(32));assert.equal(report.comparisons[0].possiblySharedDatabaseEndpoint,true);assert.equal(report.comparisons[1].sharedSupabaseProject,true);});
test('identity comparison refuses missing exports, key and duplicate environments',()=>{assert.throws(()=>compare([],''));assert.throws(()=>compare(identities.slice(0,2),'k'.repeat(32)));assert.throws(()=>compare([identities[0],identities[0],identities[2]],'k'.repeat(32)));});
test('CLI performs only offline reads and crypto, without database or network modules',()=>{
  const vm=require('node:vm');const fs=require('node:fs');const output=[];const moduleObject={exports:{}};
  const offlineRequire=name=>{assert.ok(['node:fs','node:crypto'].includes(name),`Unexpected connection-capable import: ${name}`);return name==='node:fs'?{readFileSync:()=>JSON.stringify(identities)}:require(name);};
  offlineRequire.main=moduleObject;
  vm.runInNewContext(fs.readFileSync('scripts/database-identity-audit.cjs','utf8'),{require:offlineRequire,module:moduleObject,process:{argv:['node','script','fictional.json'],env:{IDENTITY_AUDIT_KEY:'k'.repeat(32)}},console:{log:text=>output.push(text),error:text=>output.push(text)}});
  const report=JSON.parse(output[0]);assert.equal(report.liveDatabaseIdentityVerified,false);assert.equal(report.mode,'offline-config-only');assert.equal(output.join('').includes('DO_NOT_PRINT'),false);assert.equal(output.join('').includes('postgresql:'),false);
});
