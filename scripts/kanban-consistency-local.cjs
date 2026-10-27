const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict'),{Client}=require('pg'),ts=require('typescript');
const {consistentTaskPage}=require('../server/services/consistentTaskPage.cjs');
const {createTaskPager}=require('../src/app/board/taskPageCache.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kanban-consistency-'));
const bin='C:/Users/1/Documents/Codex/2026-10-08/package-report/work/postgres17/bin';
const password=crypto.randomBytes(24).toString('hex'),port=55449,output='artifacts/kanban-consistency-20261026';
let db,mutationDb,server,started=false,variant='PATCH',queries=0,selects=0,dbMs=0,sqlBytes=0,pgWireReceived=0;
const responseDelay=process.env.KANBAN_SLOW_NETWORK==='1'?100:0;
const report={date:new Date().toISOString(),base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),limitation:'Real GET/helper and actual authorization.js against synthetic PostgreSQL fixture over loopback HTTP. Authentication adapter supplies test user IDs; no login/session or mounted application browser E2E.',tests:[],baseline:[],benchmark:[]};
const measured={query:async(sql,p)=>{queries++;if(/^\s*(select|with)/i.test(sql))selects++;const at=performance.now();const r=await db.query(sql,p);dbMs+=performance.now()-at;sqlBytes+=Buffer.byteLength(JSON.stringify(r.rows));return r;},release(){}};
function loadAuthorization(){const loaded={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/app/api/_lib/authorization.js','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('exports','module',code)(loaded.exports,loaded);return loaded.exports;}
let authorization=loadAuthorization();
function makeBase(){const s=execFileSync('git',['show','HEAD:src/app/api/tables/[tableId]/tasks/route.js'],{encoding:'utf8'});const a=s.indexOf('export async function GET('),b=s.indexOf('// People cells',a);return new Function('pool','getAuthenticatedUser','requireBoardPermission','recordAccessQueryContext','rowMatchesRecordAccess','normalizePeopleValues','NextResponse','toArray','after',s.slice(a,b).replace('export async function GET','async function GET')+';return GET;')({connect:async()=>measured},req=>req.user,authorization.requireBoardPermission,authorization.recordAccessQueryContext,authorization.rowMatchesRecordAccess,(_c,v)=>v,{json:(body,init={})=>new Response(JSON.stringify(body),{status:init.status||200})},()=>[],()=>{});}
async function check(name,fn){try{await fn();report.tests.push({name,status:'PASS'});}catch(e){report.tests.push({name,status:'FAIL',error:e.message});}}
async function seed(n){await db.query('TRUNCATE rows');await db.query(`INSERT INTO rows(id,table_id,values,created_at,created_by) SELECT lpad(i::text,6,'0'),'board',jsonb_build_object('order',i,'status',CASE WHEN i%5=0 THEN 'Done' ELSE 'Todo' END),TIMESTAMPTZ '2026-01-01','owner' FROM generate_series(1,$1::int)i`,[n]);}
async function get(params={},user='owner'){const r=await fetch(`http://127.0.0.1:${server.address().port}/board?${new URLSearchParams(params)}`,{headers:{'x-test-user':user}});const text=await r.text();return{status:r.status,body:JSON.parse(text),bytes:Buffer.byteLength(text)};}
function pagerFor(user='owner',capture=true){
  const sample={requests:0,bytes:0,times:[],published:[]};
  const pager=createTaskPager({identity:{userId:user,workspaceId:'workspace',tableId:'board'},onChange:s=>{if(capture)sample.published.push(s);},fetchPage:async(params,signal)=>{
    const at=performance.now();sample.requests++;const response=await fetch(`http://127.0.0.1:${server.address().port}/board?${new URLSearchParams(params)}`,{headers:{'x-test-user':user},signal});const text=await response.text();sample.bytes+=Buffer.byteLength(text);sample.times.push(performance.now()-at);return{ok:response.ok,status:response.status,json:async()=>JSON.parse(text)};
  }});return{pager,sample};
}
async function main(){
  const pw=path.join(dir,'password');fs.writeFileSync(pw,password);
  execFileSync(path.join(bin,'initdb.exe'),['-D',path.join(dir,'data'),'-U','local_test','--pwfile',pw,'-A','scram-sha-256','--encoding=UTF8','--locale=C'],{stdio:'pipe',timeout:30000});fs.unlinkSync(pw);
  execFileSync(path.join(bin,'pg_ctl.exe'),['-D',path.join(dir,'data'),'-l',path.join(dir,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start'],{stdio:'ignore',timeout:30000});started=true;
  db=new Client({host:'127.0.0.1',port,user:'local_test',password,database:'postgres'});await db.connect();
  mutationDb=new Client({host:'127.0.0.1',port,user:'local_test',password,database:'postgres'});await mutationDb.connect();
  assert.notEqual((await db.query('SELECT pg_backend_pid() AS pid')).rows[0].pid,(await mutationDb.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
  db.connection.stream.on('data',chunk=>{pgWireReceived+=chunk.length;});
  assert.equal((await db.query('SELECT host(inet_server_addr()) AS host')).rows[0].host,'127.0.0.1');
  await db.query(`CREATE TABLE workspaces(id text PRIMARY KEY,owner_id text);
    CREATE TABLE tables(id text PRIMARY KEY,name text,workspace_id text,columns jsonb,shared_users jsonb);
    CREATE TABLE workspace_members(workspace_id text,user_id text,workspace_role text,role text,record_access jsonb,team_id text,department_id text,company_id text);
    CREATE TABLE board_member_access(table_id text,user_id text,board_role text,record_access jsonb);
    CREATE TABLE rows(id text PRIMARY KEY,table_id text,values jsonb,created_at timestamptz,created_by text);
    CREATE INDEX local_rows_board ON rows(table_id);
    INSERT INTO workspaces VALUES('workspace','owner'),('foreign','foreign-owner');
    INSERT INTO tables VALUES('board','Board','workspace','[{"id":"status","type":"Status"},{"id":"other","type":"Status"},{"id":"name","type":"Text"}]','[]');
    INSERT INTO workspace_members VALUES('workspace','member','member','member','{"scope":"created_by_me"}',NULL,NULL,NULL);
    INSERT INTO board_member_access VALUES('board','member','viewer','{"scope":"created_by_me"}');`);
  const migration=fs.readFileSync('server/db/migrations/022_universal_roles_and_portals.sql','utf8');
  const at=migration.indexOf('CREATE OR REPLACE FUNCTION smart_manage_json_value_matches(');
  assert.ok(at>=0);await db.query(migration.slice(at));
  const base=makeBase();
  server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');const user=req.headers['x-test-user'];
    try{
      if(responseDelay)await new Promise(resolve=>setTimeout(resolve,responseDelay));
      if(user==='anonymous'){res.writeHead(401);res.end('{}');return;}
      if(variant==='BASE'){const response=await base({user:{id:user},nextUrl:url},{params:Promise.resolve({tableId:'board'})});res.writeHead(response.status);res.end(await response.text());return;}
      const result=await consistentTaskPage({pool:{connect:async()=>measured},userId:user,tableId:'board',searchParams:url.searchParams,...authorization});res.writeHead(result.status,{'content-type':'application/json'});res.end(JSON.stringify(result.body));
    }catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  await check('independent mutation connection cannot split a repeatable-read snapshot',async()=>{
    await seed(100);
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
      assert.equal((await db.query('SELECT count(*)::int AS count FROM rows')).rows[0].count,100);
      await mutationDb.query("INSERT INTO rows VALUES('separate-session','board','{\"order\":101,\"status\":\"Todo\"}',now(),'owner')");
      assert.equal((await db.query('SELECT count(*)::int AS count FROM rows')).rows[0].count,100);
    } finally {await db.query('ROLLBACK');}
    assert.equal((await db.query('SELECT count(*)::int AS count FROM rows')).rows[0].count,101);
  });
  for(const n of [0,1,99,100,101,500,1000,5000])await check(`PostgreSQL traversal ${n}`,async()=>{await seed(n);const{pager}=pagerFor();await pager.load({statusColumnId:'status'});while(pager.snapshot().global.hasMore)await pager.load({statusColumnId:'status'},true);assert.equal(pager.snapshot().rows.length,n);assert.equal(new Set(pager.snapshot().rows.map(r=>r.id)).size,n);pager.dispose();});
  for(const mutation of ['DELETE','INSERT','REORDER','STATUS','PERMISSION'])await check(`concurrent ${mutation}: BASE RED / PATCH GREEN`,async()=>{
    const mutate=async()=>{
      if(mutation==='DELETE')await mutationDb.query("DELETE FROM rows WHERE id='000001'");
      if(mutation==='INSERT')await mutationDb.query("INSERT INTO rows VALUES('new','board','{\"order\":0,\"status\":\"Todo\"}',now(),'owner')");
      if(mutation==='REORDER')await mutationDb.query("UPDATE rows SET values=values||'{\"order\":0}' WHERE id='000101'");
      if(mutation==='STATUS')await mutationDb.query("UPDATE rows SET values=values||'{\"status\":\"Done\"}' WHERE id='000001'");
      if(mutation==='PERMISSION')await mutationDb.query("DELETE FROM rows WHERE id='000001'");
    };
    await seed(101);await db.query("UPDATE rows SET values=values||'{\"status\":\"Todo\"}'");
    // Legacy OFFSET behavior on the exact SQL ordering, between committed requests.
    const first=(await db.query("SELECT id FROM rows WHERE values->>'status'='Todo' ORDER BY (values->>'order')::int,created_at DESC,id LIMIT 100")).rows;
    await mutate();const second=(await db.query("SELECT id FROM rows WHERE values->>'status'='Todo' ORDER BY (values->>'order')::int,created_at DESC,id LIMIT 100 OFFSET 100")).rows;
    const old=[...first,...second].map(r=>r.id);const actual=(await db.query("SELECT id FROM rows WHERE values->>'status'='Todo'")).rows.map(r=>r.id);
    const baseFailure={mutation,duplicates:old.length-new Set(old).size,missing:actual.filter(id=>!old.includes(id)).length,stale:old.filter(id=>!actual.includes(id)).length};report.baseline.push(baseFailure);assert.ok(baseFailure.duplicates+baseFailure.missing+baseFailure.stale>0);
    await seed(101);await db.query("UPDATE rows SET values=values||'{\"status\":\"Todo\"}'");
    const{pager}=pagerFor();const scope={statusColumnId:'status',statusValue:'Todo'};await pager.load(scope);await mutate();await pager.load(scope,true);
    while(pager.snapshot().scopes.values().next().value.hasMore)await pager.load(scope,true);
    const expected=(await db.query("SELECT id FROM rows WHERE values->>'status'='Todo'")).rows.map(r=>r.id);
    assert.deepEqual(new Set(pager.snapshot().rows.map(r=>r.id)),new Set(expected));assert.equal(pager.snapshot().rows.length,expected.length);pager.dispose();
  });
  await check('actual authorization denies foreign workspace user',async()=>assert.equal((await get({limit:'100'},'foreign-owner')).status,404));
  await check('actual row permission filters before LIMIT/count',async()=>{await seed(101);await db.query("UPDATE rows SET created_by='member' WHERE id IN ('000002','000007')");const r=await get({limit:'1',statusColumnId:'status',statusValue:'Todo'},'member');assert.equal(r.status,200);assert.equal(r.body.total,2);assert.equal(r.body.rows.length,1);});
  await check('permission revocation invalidates cached revision',async()=>{await seed(101);await db.query("UPDATE rows SET created_by='member'");const{pager}=pagerFor('member');await pager.load({});await db.query("UPDATE board_member_access SET record_access='{\"scope\":\"selected_records\",\"ids\":[]}' WHERE user_id='member'");await pager.reconcile();assert.equal(pager.snapshot().rows.length,0);await db.query("UPDATE board_member_access SET record_access='{\"scope\":\"created_by_me\"}' WHERE user_id='member'");pager.dispose();});
  await check('unknown/wrong status column rejected; values parameterized',async()=>{for(const c of ['invalid','name'])assert.equal((await get({statusColumnId:c,limit:'100'})).status,400);const r=await get({statusColumnId:'status',statusValue:"Todo' OR 1=1 --",limit:'100'});assert.equal(r.status,200);assert.equal(r.body.total,0);});
  await check('maximum limit and out-of-range total',async()=>{await seed(1000);const r=await get({limit:'9999'});assert.equal(r.body.limit,500);assert.equal(r.body.rows.length,500);const last=await get({limit:'100',offset:'9999',revision:r.body.revision});assert.equal(last.body.total,1000);assert.equal(last.body.rows.length,0);});
  await check('empty and null status match and retain global counts',async()=>{await seed(3);await db.query("UPDATE rows SET values=values-'status' WHERE id='000001'");await db.query("UPDATE rows SET values=values||'{\"status\":null}' WHERE id='000002'");const r=await get({limit:'100',statusColumnId:'status',statusValue:'',includeCounts:'1'});assert.equal(r.body.total,2);assert.equal(r.body.statusCounts.Todo,1);});
  await check('subsequent pages require an explicit valid revision',async()=>{assert.equal((await get({limit:'100',offset:'100'})).status,400);assert.equal((await get({limit:'100',offset:'-1'})).status,400);assert.equal((await get({limit:'100',offset:'100',revision:'invalid'})).status,409);});
  await check('database exception rolls back read transaction and next request works',async()=>{await seed(1);await db.query("UPDATE rows SET values=values||'{\"order\":\"invalid\"}'");assert.equal((await get({limit:'100'})).status,500);await db.query("UPDATE rows SET values=values||'{\"order\":1}'");assert.equal((await get({limit:'100'})).status,200);assert.equal((await db.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'off');});
  await check('legacy authorization applies SQL visibility before pagination',async()=>{
    await db.query('ALTER TABLE board_member_access RENAME TO local_hidden_board_access');
    try {authorization=loadAuthorization();await seed(101);await db.query("UPDATE tables SET shared_users='[{\"userId\":\"member\",\"role\":\"driver\",\"permission\":\"read\"}]'");await db.query("UPDATE rows SET values=values||'{\"_assignedDriverUserId\":\"member\"}' WHERE id='000101'");const r=await get({limit:'1'},'member');assert.equal(r.status,200);assert.equal(r.body.total,1);assert.equal(r.body.rows[0].id,'000101');}
    finally {await db.query('ALTER TABLE local_hidden_board_access RENAME TO board_member_access');await db.query("UPDATE tables SET shared_users='[]'");authorization=loadAuthorization();}
  });
  for(const n of [100,101,500,1000,5000])for(const v of ['BASE','PATCH']){
    variant=v;await seed(n);await get({limit:'100'});const times=[];let requests=0,bytes=0;queries=selects=dbMs=sqlBytes=pgWireReceived=0;
    const mem=process.memoryUsage().heapUsed;
    for(let repeat=0;repeat<3;repeat++){
      if(v==='BASE')for(let offset=0;offset<n;offset+=100){const at=performance.now();const r=await get({limit:'100',offset:String(offset)});assert.equal(r.status,200);times.push(performance.now()-at);requests++;bytes+=r.bytes;}
      else {const{pager,sample}=pagerFor('owner',false);await pager.load({});while(pager.snapshot().global.hasMore)await pager.load({},true);requests+=sample.requests;bytes+=sample.bytes;times.push(...sample.times);pager.dispose();}
    }
    times.sort((a,b)=>a-b);report.benchmark.push({tasks:n,variant:v,repeats:3,responseDelay,requests,bytes,queries,selects,dbMs,sqlBytes,pgWireReceived,p50:times[Math.floor(times.length*.5)],p95:times[Math.min(times.length-1,Math.floor(times.length*.95))],heapDelta:process.memoryUsage().heapUsed-mem});console.log('BENCHMARK',v,n,'delay',responseDelay);
  }
}
main().catch(error=>{report.fatal=error.message;process.exitCode=1;}).finally(async()=>{
  if(server)await new Promise(r=>server.close(r));if(mutationDb)await mutationDb.end();if(db)await db.end();
  if(started)execFileSync(path.join(bin,'pg_ctl.exe'),['-D',path.join(dir,'data'),'-m','fast','-w','stop'],{stdio:'ignore',timeout:30000});
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,responseDelay?'postgres-http-slow.json':'postgres-http.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  console.log('Disposable cluster stopped:',dir);if(report.tests.some(t=>t.status==='FAIL'))process.exitCode=1;
});
