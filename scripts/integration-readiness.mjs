import fs from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import pg from 'pg';
import { requireBoardPermission, requireRowPermission, recordAccessQueryContext, rowMatchesRecordAccess } from '../src/app/api/_lib/authorization.js';
import requestReads from '../server/db/requestReadPool.cjs';
const url=new URL(process.env.DATABASE_URL);
assert(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname.includes('test'));
const db=new pg.Client({connectionString:url.toString(),ssl:false});await db.connect();
const pool={query:(...args)=>db.query(...args),connect:async()=>({query:(...args)=>db.query(...args),release(){}})};
const results={mode:'isolated-combined-integration',checks:{},cases:[],limitations:['GET handler uses real PostgreSQL authorization; authenticated JWT login tested in separate Chromium workflow','No Production data or billed Egress measurement']};
try{
  const migrationNames=['044_automation_runtime_schema.sql','045_uploaded_files_workspace_fk_index.sql','046_guarded_duplicate_indexes.sql'];
  const ledger=(await db.query('SELECT filename,checksum FROM schema_migrations ORDER BY filename')).rows;
  // Synthetic historical NULL checksums must remain NULL during the upgrade.
  for(const row of ledger.slice(0,9))await db.query('UPDATE schema_migrations SET checksum=NULL WHERE filename=$1',[row.filename]);
  const historical=(await db.query('SELECT filename,checksum FROM schema_migrations ORDER BY filename')).rows;
  for(const name of migrationNames){const sql=await fs.readFile(`server/db/migrations/${name}`,'utf8');await db.query('BEGIN');try{await db.query(sql);await db.query('INSERT INTO schema_migrations(filename,checksum,execution_ms) VALUES($1,$2,0)',[name,createHash('sha256').update(sql).digest('hex')]);await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}}
  assert.deepEqual((await db.query('SELECT filename,checksum FROM schema_migrations WHERE filename=ANY($1) ORDER BY filename',[historical.map(r=>r.filename)])).rows,historical);
  results.checks.upgradeOrder=migrationNames;results.checks.historicalNullChecksumsPreserved=9;
  for(const name of migrationNames){await db.query('BEGIN');await db.query(await fs.readFile(`server/db/migrations/${name}`,'utf8'));await db.query('COMMIT');}
  results.checks.idempotent=true;
  const owner=randomUUID(),outsider=randomUUID(),workspace=randomUUID(),otherWorkspace=randomUUID(),board=randomUUID(),otherBoard=randomUUID();
  await db.query('BEGIN');
  const user=async id=>db.query('INSERT INTO users(id,name,email) VALUES($1,$2,$3)',[id,'Synthetic readiness',`${id}@example.test`]);
  await user(owner);await user(outsider);
  await db.query('INSERT INTO workspaces(id,name,owner_id) VALUES($1,$2,$3),($4,$2,$5)',[workspace,'Synthetic readiness workspace',owner,otherWorkspace,outsider]);
  const columns=[{id:'name',name:'Name',type:'Text'},{id:'status',name:'Status',type:'Status',options:[{value:'Open'},{value:'Done'}]}];
  await db.query('INSERT INTO tables(id,name,workspace_id,columns) VALUES($1,$2,$3,$4),($5,$2,$6,$4)',[board,'Synthetic readiness board',workspace,JSON.stringify(columns),otherBoard,otherWorkspace]);
  const members={};for(const scope of ['all_permitted','created_by_me','assigned_to_me','my_team','my_department','my_company','selected_records','custom','admin']){const id=randomUUID();await user(id);members[scope]=id;}
  const ids=Array.from({length:12},()=>randomUUID());
  for(let i=0;i<12;i++)await db.query('INSERT INTO rows(id,table_id,values,created_by) VALUES($1,$2,$3,$4)',[ids[i],board,JSON.stringify({name:`Synthetic ${i}`,order:i,status:i%2?'Done':'Open',assignedUserId:i%2?outsider:members.assigned_to_me,teamId:i%2?'team-b':'team-a',departmentId:i%2?'dept-b':'dept-a',companyId:i%2?'company-b':'company-a',customAssignee:i%2?outsider:members.custom}),i%2?owner:members.created_by_me]);
  for(const [scope,id]of Object.entries(members)){const access=scope==='custom'?{scope,rule:{field:'customAssignee',value:'$current_user'}}:scope==='selected_records'?{scope,ids:[ids[0],ids[2]]}:{scope:scope==='admin'?'created_by_me':scope};await db.query("INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,record_access,team_id,department_id,company_id) VALUES($1,$2,'member',$3,$4,'team-a','dept-a','company-a')",[workspace,id,scope==='admin'?'admin':'member',JSON.stringify(access)]);await db.query("INSERT INTO board_member_access(table_id,user_id,board_role,record_access) VALUES($1,$2,'viewer',$3)",[board,id,JSON.stringify(access)]);}
  const source=await fs.readFile('src/app/api/tables/[tableId]/tasks/route.js','utf8');const get=source.slice(source.indexOf('export async function GET('),source.indexOf('export async function POST(')).replace('export async function','async function');
  const run=async(userId,tableId,query='?limit=5&offset=0')=>{const context={getAuthenticatedUser:()=>({id:userId}),pool,requireBoardPermission,recordAccessQueryContext,rowMatchesRecordAccess,normalizePeopleValues:(_columns,values)=>values,toArray:value=>Array.isArray(value)?value:[],NextResponse:{json:(body,options)=>({body,status:options?.status||200})},console};vm.createContext(context);vm.runInContext(get+'\nthis.run=GET;',context);return context.run({nextUrl:new URL('http://127.0.0.1/'+query)},{params:{tableId}});};
  for(const [scope,id]of [['owner',owner],...Object.entries(members)]){const expected=['owner','admin','all_permitted'].includes(scope)?12:scope==='selected_records'?2:6;const response=await run(id,board);assert.equal(response.status,200,scope);assert.equal(response.body.total,expected,scope);assert.equal(response.body.rows.length,Math.min(5,expected),scope);const tail=await run(id,board,'?limit=5&offset=5&statusColumnId=status');assert.equal(tail.status,200,scope);assert.equal(tail.body.total,expected,scope);assert.equal(Object.values(tail.body.statusCounts).reduce((a,b)=>a+b,0),expected,scope);results.cases.push({scope,status:'PASS',visibleRows:expected});}
  assert.equal((await run(outsider,board)).status,404);assert.equal((await run(owner,otherBoard)).status,404);results.checks.crossTenantBothDirections=true;
  const reader=members.assigned_to_me;assert(await requireRowPermission(requestReads.requestReadPool(pool),reader,ids[0],'viewer',board));await db.query('DELETE FROM board_member_access WHERE user_id=$1',[reader]);await db.query('DELETE FROM workspace_members WHERE user_id=$1',[reader]);assert.equal(await requireRowPermission(requestReads.requestReadPool(pool),reader,ids[0],'viewer',board),null);results.checks.revocationEffectiveNextRequest=true;
  await db.query('ROLLBACK');results.checks.syntheticDataRolledBack=true;
  for(const name of ['046_guarded_duplicate_indexes','045_uploaded_files_workspace_fk_index']){await db.query('BEGIN');await db.query(await fs.readFile(`server/db/rollbacks/${name}.down.sql`,'utf8'));await db.query('COMMIT');}results.checks.indexRollback=true;
  // Reapply SQL for test schema consistency; deliberately do not rewrite history.
  for(const name of migrationNames){await db.query('BEGIN');await db.query(await fs.readFile(`server/db/migrations/${name}`,'utf8'));await db.query('COMMIT');}
  results.checks.migrationsReapplied=true;
}finally{await fs.mkdir('artifacts/integration-readiness',{recursive:true});await fs.writeFile('artifacts/integration-readiness/results.json',JSON.stringify(results,null,2));await db.end();}
