// Offline config comparison only: no database/network access and no secret output.
const fs = require('node:fs');
const crypto = require('node:crypto');
function compare(configs, key) {
  if (!key || key.length < 32) throw new Error('Ephemeral fingerprint key required');
  if (!Array.isArray(configs) || configs.length !== 3) throw new Error('Three environment exports required');
  const seen = new Set();
  const results = configs.map(entry => {
    const environment=String(entry.environment).toLowerCase();
    if (!['production','preview','development'].includes(environment) || seen.has(environment)) throw new Error('Unique environment labels required');
    seen.add(environment);
    let db, supabase;
    try {db=new URL(entry.DATABASE_URL);supabase=new URL(entry.NEXT_PUBLIC_SUPABASE_URL);} catch {throw new Error('Environment identity incomplete');}
    if (!['postgres:','postgresql:'].includes(db.protocol) || supabase.protocol!=='https:') throw new Error('Environment identity format invalid');
    const fingerprint=value=>crypto.createHmac('sha256',key).update(value).digest('hex');
    return {environment,databaseFingerprint:fingerprint(`${db.hostname}:${db.port||'5432'}${db.pathname}`),supabaseFingerprint:fingerprint(supabase.origin)};
  });
  const production=results.find(row=>row.environment==='production');
  const comparisons=results.filter(row=>row!==production).map(row=>({environment:row.environment,sharedSupabaseProject:row.supabaseFingerprint===production.supabaseFingerprint,possiblySharedDatabaseEndpoint:row.databaseFingerprint===production.databaseFingerprint}));
  return {mode:'offline-config-only',liveDatabaseIdentityVerified:false,comparisons};
}
if(require.main===module) {
  try {const report=compare(JSON.parse(fs.readFileSync(process.argv[2],'utf8')),process.env.IDENTITY_AUDIT_KEY);console.log(JSON.stringify(report));if(report.comparisons.some(r=>r.sharedSupabaseProject||r.possiblySharedDatabaseEndpoint))process.exitCode=1;}
  catch {console.error('Identity audit refused: complete authorized environment exports and an ephemeral key are required. Values withheld.');process.exitCode=1;}
}
module.exports={compare};
