const fs = require('node:fs');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { Client } = require('pg');
const read = name => fs.readFileSync(`server/db/${name}`, 'utf8');
const pairs = [ ['idx_rows_table_id','rows_table_id_scheduled_idx'], ['idx_rows_table_id_base','rows_table_id_scheduled_idx'], ['idx_tables_workspace_id_base','idx_tables_workspace_id'], ['idx_uploaded_files_row_id','uploaded_files_row_id_idx'], ['uploaded_files_table_id_idx','idx_uploaded_files_table_id'] ];
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert(['localhost','127.0.0.1'].includes(url.hostname) && url.pathname.includes('test'));
  const db = new Client({connectionString:url.toString(),ssl:false});await db.connect();
  try {
    await db.query('BEGIN');
    await db.query(`CREATE TABLE workspaces(id TEXT PRIMARY KEY);
      CREATE TABLE tables(id TEXT PRIMARY KEY,workspace_id TEXT REFERENCES workspaces ON DELETE CASCADE);
      CREATE TABLE rows(id TEXT PRIMARY KEY,table_id TEXT REFERENCES tables ON DELETE CASCADE);
      CREATE TABLE uploaded_files(id TEXT PRIMARY KEY,table_id TEXT REFERENCES tables ON DELETE CASCADE,row_id TEXT REFERENCES rows ON DELETE CASCADE,workspace_id TEXT REFERENCES workspaces ON DELETE CASCADE);
      INSERT INTO workspaces SELECT 'w'||i FROM generate_series(1,1001) i;
      INSERT INTO tables SELECT 't'||i,'w'||i FROM generate_series(1,1000) i;
      INSERT INTO rows SELECT 'r'||i,'t'||(1+(i%1000)) FROM generate_series(1,100000) i;
      INSERT INTO uploaded_files SELECT 'f'||i,'t'||(1+(i%1000)),'r'||i,'w'||(1+(i%1000)) FROM generate_series(1,100000) i;`);
    const definitions = JSON.parse(fs.readFileSync('docs/index-advisor/catalog-inventory.json','utf8')).indexes;
    const names = new Set(pairs.flat());
    for (const entry of definitions.filter(i=>names.has(i.index_name))) await db.query(entry.definition);
    await db.query('ANALYZE');
    const queries={rowLookup:"SELECT id FROM rows WHERE table_id='t42' ORDER BY id",boardLookup:"SELECT id FROM tables WHERE workspace_id='w42'",fileRowLookup:"SELECT id FROM uploaded_files WHERE row_id='r42'",fileBoardLookup:"SELECT id FROM uploaded_files WHERE table_id='t42' ORDER BY id",fileWorkspaceLookup:"SELECT id FROM uploaded_files WHERE workspace_id='w42' ORDER BY id",parentDelete:"DELETE FROM workspaces WHERE id='w1001'"};
    const measure=async()=>{const output={};for(const [key,sql] of Object.entries(queries)){const times=[];let rows;for(let i=0;i<10;i++){await db.query('SAVEPOINT sample');const start=performance.now();const r=await db.query(sql);times.push(performance.now()-start);rows=r.rows;await db.query('ROLLBACK TO SAVEPOINT sample');}await db.query('SAVEPOINT plan');const plan=(await db.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+sql)).rows[0]['QUERY PLAN'][0];await db.query('ROLLBACK TO SAVEPOINT plan');times.sort((a,b)=>a-b);output[key]={p50Ms:times[4],p95Ms:times[9],rows,plan};}return output;};
    const before=await measure();
    const schemaState=async()=> (await db.query("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl,(SELECT jsonb_agg(pg_get_constraintdef(oid) ORDER BY conname) FROM pg_constraint WHERE conrelid=c.oid) constraints FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname")).rows;
    const securityBefore=await schemaState();
    const sizesBefore=(await db.query("SELECT sum(pg_relation_size(indexrelid))::text bytes FROM pg_index WHERE indrelid IN ('rows'::regclass,'tables'::regclass,'uploaded_files'::regclass)")).rows[0];
    for(const name of ['045_uploaded_files_workspace_fk_index.sql','046_guarded_duplicate_indexes.sql'])await db.query(read('migrations/'+name));
    for(const name of ['045_uploaded_files_workspace_fk_index.sql','046_guarded_duplicate_indexes.sql'])await db.query(read('migrations/'+name));
    assert.deepEqual(await schemaState(),securityBefore);
    const after=await measure();for(const key of Object.keys(queries))assert.deepEqual(after[key].rows,before[key].rows);
    const usedIndexes=plan=>[...(plan['Index Name']?[plan['Index Name']]:[]),...(plan.Plans||[]).flatMap(usedIndexes)];
    for(const [scenario,survivor] of [['rowLookup','rows_table_id_scheduled_idx'],['boardLookup','idx_tables_workspace_id'],['fileRowLookup','uploaded_files_row_id_idx'],['fileBoardLookup','idx_uploaded_files_table_id'],['fileWorkspaceLookup','uploaded_files_workspace_id_idx']])assert(usedIndexes(after[scenario].plan.Plan).includes(survivor),`Retained index not used: ${survivor}`);
    for(const [old,keep] of pairs){assert.equal((await db.query('SELECT to_regclass($1) old,to_regclass($2) keep',[old,keep])).rows[0].old,null);assert((await db.query('SELECT to_regclass($1) keep',[keep])).rows[0].keep);}
    const sizesAfter=(await db.query("SELECT sum(pg_relation_size(indexrelid))::text bytes FROM pg_index WHERE indrelid IN ('rows'::regclass,'tables'::regclass,'uploaded_files'::regclass)")).rows[0];
    await db.query(read('rollbacks/046_guarded_duplicate_indexes.down.sql'));await db.query(read('rollbacks/045_uploaded_files_workspace_fk_index.down.sql'));
    for(const [old] of pairs)assert((await db.query('SELECT to_regclass($1) present',[old])).rows[0].present);
    // A same-name index with a changed predicate must fail closed.
    await db.query('DROP INDEX idx_rows_table_id; CREATE INDEX idx_rows_table_id ON rows(table_id) WHERE table_id IS NOT NULL');
    await db.query('SAVEPOINT unsafe');await assert.rejects(db.query(read('migrations/046_guarded_duplicate_indexes.sql')),/Unsafe or non-equivalent/);await db.query('ROLLBACK TO SAVEPOINT unsafe');
    fs.mkdirSync('artifacts/index-advisor',{recursive:true});
    fs.writeFileSync('artifacts/index-advisor/results.json',JSON.stringify({classification:'MEASURED_ISOLATED_POSTGRESQL',before,after,sizesBefore,sizesAfter,checks:{resultsEqual:true,aclRlsConstraintsUnchanged:true,idempotent:true,rollback:true,driftRejected:true},limitations:['Synthetic sizes and plans are not Production latency','Supabase advisor engine is not installed locally; catalog checks used']},null,2));
    await db.query('ROLLBACK');
  } finally {await db.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
