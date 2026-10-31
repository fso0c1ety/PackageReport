const fs=require('node:fs'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');const {Client}=require('pg');
async function main(){
 const url=new URL(process.env.DATABASE_URL);assert(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname.includes('test'));
 const options={connectionString:url.toString(),ssl:false};const db=new Client(options),blocker=new Client(options);await db.connect();await blocker.connect();
 const sql=name=>fs.readFileSync('server/db/'+name,'utf8');const results=[];
 try{
  await db.query('CREATE TABLE tables(id TEXT PRIMARY KEY,workspace_id TEXT); CREATE TABLE rows(id TEXT PRIMARY KEY,table_id TEXT); CREATE TABLE uploaded_files(id TEXT PRIMARY KEY,table_id TEXT,row_id TEXT,workspace_id TEXT)');
  const pairs=new Set(['idx_rows_table_id','idx_rows_table_id_base','rows_table_id_scheduled_idx','idx_tables_workspace_id','idx_tables_workspace_id_base','idx_uploaded_files_row_id','uploaded_files_row_id_idx','idx_uploaded_files_table_id','uploaded_files_table_id_idx']);
  for(const entry of JSON.parse(fs.readFileSync('docs/index-advisor/catalog-inventory.json','utf8')).indexes.filter(i=>pairs.has(i.index_name)))await db.query(entry.definition);
  await db.query("INSERT INTO uploaded_files SELECT 'f'||i,'t'||i,'r'||i,'w'||i FROM generate_series(1,10000)i");
  for(const [name,lock]of [['045_uploaded_files_workspace_fk_index.sql','LOCK TABLE uploaded_files IN ROW EXCLUSIVE MODE'],['046_guarded_duplicate_indexes.sql','LOCK TABLE rows IN ACCESS SHARE MODE']]){
   await blocker.query('BEGIN');await blocker.query(lock);await db.query('BEGIN');const start=performance.now();let code;
   try{await db.query(sql('migrations/'+name));}catch(error){code=error.code;}finally{await db.query('ROLLBACK');await blocker.query('ROLLBACK');}
   assert.equal(code,'55P03');results.push({migration:name,scenario:'contended',sqlstate:code,elapsedMs:performance.now()-start,aborted:true});
  }
  for(const name of ['045_uploaded_files_workspace_fk_index.sql','046_guarded_duplicate_indexes.sql']){await db.query('BEGIN');const start=performance.now();await db.query(sql('migrations/'+name));await db.query('COMMIT');results.push({migration:name,scenario:'uncontended',elapsedMs:performance.now()-start,committed:true});}
  for(const name of ['046_guarded_duplicate_indexes.down.sql','045_uploaded_files_workspace_fk_index.down.sql']){await db.query('BEGIN');const start=performance.now();await db.query(sql('rollbacks/'+name));await db.query('COMMIT');results.push({migration:name,scenario:'rollback',elapsedMs:performance.now()-start,committed:true});}
  for(const name of pairs)assert((await db.query('SELECT to_regclass($1) present',[name])).rows[0].present);
  assert.equal((await db.query('SELECT count(*)::int n FROM uploaded_files')).rows[0].n,10000);
  fs.mkdirSync('artifacts/index-advisor',{recursive:true});fs.writeFileSync('artifacts/index-advisor/lock-budget.json',JSON.stringify({classification:'MEASURED_ISOLATED_POSTGRESQL',rows:10000,results,dataPreserved:true,productionDuration:'UNKNOWN',concurrently:'Not attempted: current migrations are transactional; separate nontransactional plan requires independent review'},null,2));
 }finally{await blocker.query('ROLLBACK').catch(()=>{});await db.query('ROLLBACK').catch(()=>{});await db.query('DROP TABLE IF EXISTS uploaded_files; DROP TABLE IF EXISTS rows; DROP TABLE IF EXISTS tables');await blocker.end();await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
