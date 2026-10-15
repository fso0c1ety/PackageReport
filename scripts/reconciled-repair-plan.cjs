// Explicitly approved forward repairs, NOT a claim that unknown history ran.
const { checksum } = require('../server/db/migrationUtils');
const REPAIR_ORDER = Object.freeze(['043_existing_schema_compatibility.sql', '041_server_only_rls_baseline.sql', '042_server_only_platform_rls.sql']);
function validateReconciledPlan(files, rows, manifest, env, schemaHash) {
  const reject = () => { throw new Error('Reconciled repair approval/evidence mismatch'); };
  if (env.RECONCILED_REPAIR_APPROVED !== '1' || !manifest || manifest.version !== 1 || manifest.mode !== 'preserve-unknown-history') reject();
  if (manifest.releaseSha !== env.APPROVED_SHA || manifest.projectRef !== 'gxzvlsukjodbarlcjyys') reject();
  if (checksum(JSON.stringify(manifest)) !== env.EXPECTED_RECONCILIATION_HASH) reject();
  if (!/^[a-f0-9]{64}$/.test(schemaHash) || manifest.schemaHash !== schemaHash) reject();
  const ledger = rows.map(({filename,checksum})=>({filename,checksum})).sort((a,b)=>a.filename.localeCompare(b.filename,'en'));
  const canonical = entries=>JSON.stringify([...entries].sort((a,b)=>a.filename.localeCompare(b.filename,'en')));
  if (!Array.isArray(manifest.originalLedger) || canonical(manifest.originalLedger)!==JSON.stringify(ledger)) reject();
  if (new Set(rows.map(r=>r.filename)).size!==rows.length) reject();
  for (const row of rows) {
    const file=files.find(f=>f.filename===row.filename);
    if (!file || (row.checksum!==null && row.checksum!==file.checksum)) reject();
  }
  const unknownNulls=rows.filter(r=>r.checksum===null).map(r=>r.filename).sort();
  if (!Array.isArray(manifest.preserveNullChecksums) || JSON.stringify([...manifest.preserveNullChecksums].sort())!==JSON.stringify(unknownNulls)) reject();
  const inventory=files.map(({filename,checksum})=>({filename,checksum}));
  if (!Array.isArray(manifest.inventory) || canonical(manifest.inventory)!==canonical(inventory)) reject();
  if (REPAIR_ORDER.some(name=>rows.some(r=>r.filename===name))) reject();
  const excluded=files.filter(f=>!rows.some(r=>r.filename===f.filename)&&!REPAIR_ORDER.includes(f.filename)).map(f=>f.filename).sort();
  if (!Array.isArray(manifest.unverifiedLegacy) || manifest.unverifiedLegacy.some(r=>r.execution!=='unknown' || r.action!=='do-not-replay' || typeof r.evidence!=='string' || r.evidence.trim().length<20)) reject();
  if (JSON.stringify(manifest.unverifiedLegacy.map(r=>r.filename).sort())!==JSON.stringify(excluded)) reject();
  const plan=REPAIR_ORDER.map(name=>files.find(f=>f.filename===name));
  if (plan.some(f=>!f) || checksum(JSON.stringify(plan.map(({filename,checksum})=>({filename,checksum}))))!==env.EXPECTED_PLAN_HASH) reject();
  return plan;
}
async function schemaEvidenceHash(client) {
  // Hash definitions in the database: no row data, function bodies or ACLs logged.
  const result=await client.query(`SELECT encode(extensions.digest(string_agg(item,'\n' ORDER BY item),'sha256'),'hex') AS evidence FROM (
    SELECT 'column:'||n.nspname||'.'||c.relname||':'||a.attnum||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') AS item
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname IN ('public','auth','vault') AND a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p','v','m')
    UNION ALL SELECT 'constraint:'||n.nspname||'.'||c.relname||':'||k.conname||':'||pg_get_constraintdef(k.oid) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','vault')
    UNION ALL SELECT 'index:'||schemaname||'.'||indexname||':'||indexdef FROM pg_indexes WHERE schemaname IN ('public','auth','vault')
    UNION ALL SELECT 'function:'||p.oid::regprocedure::text||':'||encode(extensions.digest(pg_get_functiondef(p.oid),'sha256'),'hex') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'
    UNION ALL SELECT 'function-acl:'||p.oid::regprocedure::text||':'||pg_get_userbyid(p.proowner)||':'||coalesce(pg_get_userbyid(a.grantee),'PUBLIC')||':'||a.privilege_type||':'||a.is_grantable FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname IN ('public','auth','vault') AND p.prokind='f'
    UNION ALL SELECT 'trigger:'||n.nspname||'.'||c.relname||':'||t.tgname||':'||t.tgenabled::text||':'||pg_get_triggerdef(t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','vault') AND NOT t.tgisinternal
    UNION ALL SELECT 'policy:'||schemaname||'.'||tablename||':'||policyname||':'||permissive||':'||roles::text||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'') FROM pg_policies WHERE schemaname IN ('public','auth','vault')
    UNION ALL SELECT 'role:'||rolname||':'||rolsuper||':'||rolinherit||':'||rolcreaterole||':'||rolcreatedb||':'||rolreplication||':'||rolbypassrls FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role','supabase_auth_admin')
    UNION ALL SELECT 'table:'||n.nspname||'.'||c.relname||':'||pg_get_userbyid(c.relowner)||':'||c.relrowsecurity||':'||c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','vault') AND c.relkind IN ('r','p')
    UNION ALL SELECT 'acl:'||n.nspname||'.'||c.relname||':'||coalesce(pg_get_userbyid(a.grantee),'PUBLIC')||':'||a.privilege_type||':'||a.is_grantable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname IN ('public','auth','vault') AND c.relkind IN ('r','p')
  ) evidence_items`);
  if (!/^[a-f0-9]{64}$/.test(result.rows[0]?.evidence||'')) throw new Error('Schema evidence unavailable');
  return checksum(result.rows[0].evidence);
}
module.exports={REPAIR_ORDER,validateReconciledPlan,schemaEvidenceHash};
