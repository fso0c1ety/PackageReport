// Real Next.js + login/session + TableBoard browser smoke against synthetic
// disposable PostgreSQL. No Supabase service is emulated or contacted here.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync,spawn}=require('node:child_process'),{Client}=require('pg'),bcrypt=require('bcryptjs'),{chromium}=require('@playwright/test');
const root=process.cwd(),output=path.join(root,'artifacts/kanban-consistency-20261026');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kanban-browser-local-')),bin='C:/Users/1/Documents/Codex/2026-10-08/package-report/work/postgres17/bin';
const password=crypto.randomBytes(24).toString('hex'),jwt=crypto.randomBytes(32).toString('hex'),dbPort=55449,appPort=3187;
const report={date:new Date().toISOString(),tests:[],limitation:'Native Edge; real Next.js/login/session/TableBoard; synthetic local data. Supabase Realtime transport unavailable in this environment; reconnection covered separately by executable lifecycle tests.'};
let db,started=false,app,browser,logs='';
const env=Object.fromEntries(['SystemRoot','WINDIR','PATH','Path','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
Object.assign(env,{DATABASE_URL:`postgresql://local_test:${password}@127.0.0.1:${dbPort}/kanban_acceptance`,DATABASE_SSL:'false',JWT_SECRET:jwt,NEXT_TELEMETRY_DISABLED:'1',CORS_ORIGINS:`http://127.0.0.1:${appPort}`,NEXT_PUBLIC_API_URL:`http://127.0.0.1:${appPort}`});
async function check(name,fn){try{await fn();report.tests.push({name,status:'PASS'});console.log('PASS',name);}catch(e){report.tests.push({name,status:'FAIL',error:e.message});console.log('FAIL',name);}fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'browser-progress.json'),JSON.stringify(report,null,2));}
async function main(){
  const pw=path.join(dir,'password');fs.writeFileSync(pw,password);
  execFileSync(path.join(bin,'initdb.exe'),['-D',path.join(dir,'data'),'-U','local_test','--pwfile',pw,'-A','scram-sha-256','--encoding=UTF8','--locale=C'],{stdio:'pipe',timeout:30000});fs.unlinkSync(pw);
  execFileSync(path.join(bin,'pg_ctl.exe'),['-D',path.join(dir,'data'),'-l',path.join(dir,'postgres.log'),'-o',`-h 127.0.0.1 -p ${dbPort}`,'-w','start'],{stdio:'ignore',timeout:30000});started=true;
  db=new Client({host:'127.0.0.1',port:dbPort,user:'local_test',password,database:'postgres'});await db.connect();
  await db.query('CREATE DATABASE kanban_acceptance');await db.end();db=new Client({connectionString:env.DATABASE_URL,ssl:false});await db.connect();
  const migration=execFileSync(process.execPath,['server/db/runMigrations.js'],{env,encoding:'utf8',timeout:120000});
  report.migrations='Normal runner completed';logs+=migration;
  console.log('NORMAL_LOCAL_MIGRATIONS_PASS');
  const userId=crypto.randomUUID(),workspaceId=crypto.randomUUID(),tableId=crypto.randomUUID();
  const columns=[{id:'name',name:'Name',type:'Text',order:0},{id:'status',name:'Status',type:'Status',order:1,options:[{value:'Todo',color:'#1976d2'},{value:'Done',color:'#00c875'}]}];
  await db.query('INSERT INTO users(id,name,email,password,email_verified_at) VALUES($1,$2,$3,$4,NOW())',[userId,'Local Browser User','browser@local.invalid',await bcrypt.hash(password,10)]);
  const foreignId=crypto.randomUUID();
  await db.query('INSERT INTO users(id,name,email,password,email_verified_at) VALUES($1,$2,$3,$4,NOW())',[foreignId,'Other Local User','other@local.invalid',await bcrypt.hash(password,10)]);
  await db.query('INSERT INTO workspaces(id,name,owner_id) VALUES($1,$2,$3)',[crypto.randomUUID(),'Other Local Workspace',foreignId]);
  await db.query('INSERT INTO workspaces(id,name,owner_id) VALUES($1,$2,$3)',[workspaceId,'Local Browser Workspace',userId]);
  await db.query('INSERT INTO tables(id,name,workspace_id,columns) VALUES($1,$2,$3,$4)',[tableId,'Local Browser Board',workspaceId,JSON.stringify(columns)]);
const nextMode=process.env.KANBAN_NEXT_MODE==='dev'?'dev':'start';
report.nextMode=nextMode;
const nextArgs=['node_modules/next/dist/bin/next',nextMode,'-p',String(appPort),'-H','127.0.0.1'];
app=spawn(process.execPath,nextArgs,{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  app.stdout.on('data',v=>logs+=v);app.stderr.on('data',v=>logs+=v);
  for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${appPort}/login/`);if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
  browser=await chromium.launch({channel:'msedge',headless:true});
  await check('real authenticated cross-workspace request denied',async()=>{
    const other=await browser.newContext();
    try {const login=await other.request.post(`http://127.0.0.1:${appPort}/api/login/`,{data:{email:'other@local.invalid',password}});const session=await login.json();if(login.status()!==200)throw new Error('Other-user login failed');
      const denied=await other.request.get(`http://127.0.0.1:${appPort}/api/tables/${tableId}/tasks/?pagination=consistent&limit=100`,{headers:{Authorization:`Bearer ${session.token}`}});if(denied.status()!==404)throw new Error(`Cross-workspace status ${denied.status()}`);
    }finally{await other.close();}
  });
  for(const viewport of [{width:1440,height:900},{width:430,height:932}]) {
    const context=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500});
    await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
    const login=await context.request.post(`http://127.0.0.1:${appPort}/api/login/`,{data:{email:'browser@local.invalid',password},headers:{Origin:`http://127.0.0.1:${appPort}`}});
    const session=await login.json();if(login.status()!==200||!session.token)throw new Error(`Real login failed (${login.status()})`);
    report.tests.push({name:`real login/session ${viewport.width}`,status:'PASS'});
    await context.setExtraHTTPHeaders({Authorization:`Bearer ${session.token}`});
    await context.addInitScript(({token,user})=>{localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify(user));},{token:session.token,user:session.user});
    for(const size of [0,1,100,101,500,1000,5000]) { if(report.tests.filter(item=>item.status==='FAIL').length>=2)break; await check(`TableBoard ${viewport.width}px / ${size} tasks`,async()=>{
      await db.query('DELETE FROM rows WHERE table_id=$1',[tableId]);
      await db.query(`INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) SELECT md5(i::text||$1),$1,jsonb_build_object('name','Synthetic Task '||i,'order',i,'status',CASE WHEN i%5=0 THEN 'Done' ELSE 'Todo' END),$2,NOW(),NOW() FROM generate_series(1,$3::int)i`,[tableId,userId,size]);
      const page=await context.newPage();const traffic=[];let taskRequests=0;
      page.on('request',request=>{if(request.url().includes(`/tables/${tableId}/tasks`)&&request.method()==='GET')taskRequests++;});
      page.on('response',async response=>{if(response.url().includes(`/tables/${tableId}/tasks`)&&response.request().method()==='GET'){try{const body=await response.body();traffic.push({url:new URL(response.url()).pathname+'?'+new URL(response.url()).searchParams,status:response.status(),bytes:body.length});}catch{}}});
      try{
        const firstPage=page.waitForResponse(async response=>{
          const url=new URL(response.url());if(!url.pathname.includes(`/tables/${tableId}/tasks`)||url.searchParams.has('statusValue')||response.status()!==200)return false;
          try{return Boolean((await response.json()).revision);}catch{return false;}
        },{timeout:30000});
        await page.goto(`http://127.0.0.1:${appPort}/workspace/?id=${workspaceId}`);
        await page.getByText('Local Browser Board',{exact:true}).first().click({timeout:10000});
        const views=page.getByRole('button',{name:'Board views',exact:true});await views.waitFor({timeout:30000});
        await views.click();await page.getByRole('menu').getByText('Kanban',{exact:true}).click();await firstPage;
        await page.getByTestId('kanban-count-Todo').waitFor({timeout:10000});
        const todo=Number(await page.getByTestId('kanban-count-Todo').innerText());
        const done=Number(await page.getByTestId('kanban-count-Done').innerText());
        if(todo+done!==size)throw new Error(`Counts ${todo}+${done}, expected ${size}`);
        const initialRequests=taskRequests;
        for(let step=0;step<Math.ceil(size/100)+2;step++){
          const before=await page.locator('[data-testid^="kanban-card-"]').count();if(before===size)break;
          await page.locator('[data-rfd-droppable-id^="kanban:"]').evaluateAll(nodes=>nodes.forEach(node=>{node.scrollTop=node.scrollHeight;node.dispatchEvent(new Event('scroll'));}));
          await page.waitForFunction(before=>document.querySelectorAll('[data-testid^="kanban-card-"]').length>before,before,{timeout:15000});
        }
        const cards=await page.locator('[data-testid^="kanban-card-"]').count();
        if(cards!==size)throw new Error(`Reachable cards ${cards}, expected ${size}`);
        const beforeSwitch=taskRequests;
        await views.click();await page.getByRole('menu').getByText('Table view',{exact:true}).click();
        await views.click();await page.getByRole('menu').getByText('Kanban',{exact:true}).click();
        await page.waitForTimeout(200);
        if(taskRequests!==beforeSwitch)throw new Error(`View switches added ${taskRequests-beforeSwitch} task requests`);
        const heap=await page.evaluate(()=>performance.memory?.usedJSHeapSize||null);
        const diagnostics=await page.evaluate(()=>window.__smartManageKanbanDiagnostics||[]);
        (report.browserScenarios||=[]).push({size,viewport:viewport.width,initialRequests,requests:taskRequests,bytes:traffic.reduce((n,r)=>n+r.bytes,0),cards,heap,traffic,diagnostics});
      }finally{await page.close();}
    }); }
    await context.close();
  }
}
main().catch(e=>{report.fatal=e.message;process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();if(app && app.exitCode===null && app.signalCode===null){app.kill();await Promise.race([new Promise(r=>app.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);}if(db)await db.end();
  if(started)execFileSync(path.join(bin,'pg_ctl.exe'),['-D',path.join(dir,'data'),'-m','fast','-w','stop'],{stdio:'ignore',timeout:30000});
  const sanitize=text=>String(text).replaceAll(password,'[LOCAL_TEST_SECRET]').replaceAll(jwt,'[LOCAL_TEST_SECRET]').replace(/eyJ[A-Za-z0-9_=-]+\.[A-Za-z0-9_=-]+\.[A-Za-z0-9_=-]+/g,'[TOKEN]');
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'next-browser.json'),sanitize(JSON.stringify(report,null,2)));fs.writeFileSync(path.join(output,'next-browser.log'),sanitize(logs));
  console.log(sanitize(JSON.stringify(report,null,2)));if(report.tests.some(t=>t.status==='FAIL'))process.exitCode=1;
});
