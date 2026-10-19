import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const url = new URL(process.env.DATABASE_URL);
assert(['127.0.0.1','localhost'].includes(url.hostname) && url.pathname.includes('test'));
const db = new pg.Client({ connectionString: url.toString(), ssl:false });
await db.connect();
const mode=process.env.VOLUME_MODE; assert(['BASE','HEAD'].includes(mode));
const samplesPerTenant=Number(process.env.VOLUME_SAMPLES || 100);
const warmupRequests=Number(process.env.VOLUME_WARMUP || 20);
const repetition=Number(process.env.VOLUME_REPETITION || 1);
assert(Number.isSafeInteger(samplesPerTenant) && samplesPerTenant >= 100);
assert(Number.isSafeInteger(warmupRequests) && warmupRequests >= 1);
const fixturePath='/tmp/notification-volume-fixtures.json';
const password=process.env.VOLUME_PASSWORD; assert(password);
let fixtures;
if(mode==='BASE') {
  fixtures=[]; const hash=await bcrypt.hash(password,10);
  for(let t=0;t<2;t++) {
    const user=randomUUID(),workspace=randomUUID(),table=randomUUID(),email=`volume-${t}@example.test`;
    await db.query('INSERT INTO users(id,name,email,password,email_verified_at) VALUES($1,$2,$3,$4,NOW())',[user,'Synthetic volume user',email,hash]);
    await db.query('INSERT INTO workspaces(id,name,owner_id) VALUES($1,$2,$3)',[workspace,'Synthetic volume board',user]);
    await db.query('INSERT INTO tables(id,name,workspace_id,columns) VALUES($1,$2,$3,$4)',[table,'Synthetic board',workspace,'[]']);
    for(let i=0;i<20;i++) { const task=randomUUID(); await db.query('INSERT INTO rows(id,table_id,values,created_by) VALUES($1,$2,$3,$4)',[task,table,JSON.stringify({name:`Synthetic task ${i}`}),user]); await db.query("INSERT INTO notifications(id,recipient_id,type,data,read,created_at) VALUES($1,$2,'task_chat',$3,false,NOW())",[randomUUID(),user,JSON.stringify({tableId:table,taskId:task})]); }
    fixtures.push({user,workspace,table,email});
  }
  await fs.writeFile(fixturePath,JSON.stringify(fixtures));
} else fixtures=JSON.parse(await fs.readFile(fixturePath,'utf8'));
const browser=await chromium.launch(); const results=[];
try {
  for(let t=0;t<fixtures.length;t++) {
    const fixture=fixtures[t], context=await browser.newContext({baseURL:'http://127.0.0.1:3000'});
    const login=await context.request.post('/api/login/',{data:{email:fixture.email,password},headers:{Origin:'http://127.0.0.1:3000'}}); assert.equal(login.status(),200);
    const auth=await login.json();await context.setExtraHTTPHeaders({Authorization:`Bearer ${auth.token}`});
    const page=await context.newPage();await page.goto('/login/');
    const samples=[];let bytes=0,requests=0,transferred=0,transferKnown=true;
    const pendingSizes=new Set();
    page.on('response',response=>{if(new URL(response.url()).pathname==='/api/notifications/') {requests++;const job=response.finished().then(()=>response.request().sizes()).then(size=>{transferred+=size.responseBodySize+size.responseHeadersSize;}).catch(()=>{transferKnown=false;});pendingSizes.add(job);void job.finally(()=>pendingSizes.delete(job));}});
    // Warm module schema detection before measuring request-local repetition.
    for(let i=0;i<warmupRequests;i++) await page.evaluate(async()=>{const response=await fetch('/api/notifications/');if(response.status!==200)throw new Error('Warmup failed');await response.arrayBuffer();});
    await Promise.all([...pendingSizes]);requests=0;transferred=0;
    const snap=async()=> (await db.query("SELECT COALESCE(sum(calls),0)::text calls, COALESCE(sum(rows),0)::text rows FROM pg_stat_statements WHERE query NOT LIKE '%pg_stat_statements%'")).rows[0];
    const before=await snap();
    for(let i=0;i<samplesPerTenant;i++) { const sample=await page.evaluate(async()=>{const start=performance.now(); const response=await fetch('/api/notifications/');const text=await response.text();return {status:response.status,bytes:new TextEncoder().encode(text).length,body:JSON.parse(text),ms:performance.now()-start};});assert.equal(sample.status,200);assert.equal(sample.body.length,20);assert(sample.body.every(n=>n.recipient_id===fixture.user));samples.push(sample.ms);bytes+=sample.bytes;}
    await Promise.all([...pendingSizes]);const after=await snap();const idleStart=requests;await page.waitForTimeout(15000);
    const denied=await page.evaluate(async id=>(await fetch(`/api/tables/${id}/tasks/?limit=1&offset=0`)).status,fixtures[1-t].table);assert([403,404].includes(denied));
    const ordered=[...samples].sort((a,b)=>a-b);results.push({tenant:t+1,mode,repetition,warmupRequests,samplesMs:samples,requests,responseBytes:bytes,browserTransferredBytes:transferKnown?transferred:'UNKNOWN',p50Ms:ordered[Math.ceil(ordered.length*.5)-1],p95Ms:ordered[Math.ceil(ordered.length*.95)-1],dbCalls:Number(after.calls)-Number(before.calls),dbRows:Number(after.rows)-Number(before.rows),idle15sRequests:requests-idleStart,isolation:'PASS',scope:'notifications API from authenticated Chromium; login-page idle only; global isolated DB counters'});
    await context.close();
  }
  await fs.mkdir('/tmp/notification-volume-results',{recursive:true});await fs.writeFile(`/tmp/notification-volume-results/${mode}-${repetition}.json`,JSON.stringify({results,billedEgress:'UNKNOWN',postgresWireBytes:'UNKNOWN',gcAttribution:'UNKNOWN',poolAttribution:'UNKNOWN',tailLatencyConclusion:'INCONCLUSIVE until independent repetitions are compared'},null,2));
  const columns=Object.keys(results[0]).filter(key=>key!=='samplesMs');await fs.writeFile(`/tmp/notification-volume-results/${mode}-${repetition}.csv`,[columns.join(','),...results.map(r=>columns.map(k=>JSON.stringify(r[k])).join(','))].join('\n'));
} finally {await browser.close(); if(mode==='HEAD')for(const f of fixtures){await db.query('DELETE FROM notifications WHERE recipient_id=$1',[f.user]);await db.query('DELETE FROM workspaces WHERE id=$1',[f.workspace]);await db.query('DELETE FROM users WHERE id=$1',[f.user]);}await db.end();}
