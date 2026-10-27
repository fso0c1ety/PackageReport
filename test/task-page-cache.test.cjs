const test=require('node:test');
const assert=require('node:assert/strict');
const {createTaskPager,createRecoveryLifecycle}=require('../src/app/board/taskPageCache.cjs');
const tick=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
function harness(size=101) {
  let data=Array.from({length:size},(_,i)=>({id:String(i+1),created_at:'2026-01-01',values:{order:i+1,status:i%3?'Todo':'Done'}}));
  let version=1;const calls=[],published=[],pending=new Map();
  const h={calls,published,pending,hidden:false,delay:null,fail:null,
    mutate(fn){data=fn(data);version++;},get data(){return data;}};
  h.pager=createTaskPager({identity:{userId:'A',workspaceId:'W',tableId:'T'},isHidden:()=>h.hidden,pendingValues:()=>pending,pendingRows:()=>[],onChange:s=>published.push(s),
    fetchPage:async(params,signal)=>{
      calls.push({...params,signal});
      if(h.delay)await h.delay;
      if(h.fail)return {ok:false,status:h.fail};
      const revision=String(version);
      if(params.revision&&params.revision!==revision)return{ok:false,status:409};
      const all=[...data].sort((a,b)=>a.values.order-b.values.order);
      const rows=params.statusValue===undefined?all:all.filter(row=>String(row.values[params.statusColumnId]??'')===params.statusValue);
      const page=structuredClone(rows.slice(params.offset,params.offset+params.limit));
      const counts={};for(const row of all)counts[row.values.status]=(counts[row.values.status]||0)+1;
      return{ok:true,status:200,json:async()=>({rows:page,total:rows.length,hasMore:params.offset+page.length<rows.length,revision,...(params.includeCounts==='1'?{statusCounts:counts}:{})})};
    }});
  return h;
}
const global={statusColumnId:'status'};
for(const n of [0,1,99,100,101,500,1000,5000])test(`all ${n} IDs reachable without duplicates`,async()=>{
  const h=harness(n);await h.pager.load(global);while(h.pager.snapshot().global.hasMore)await h.pager.load(global,true);
  assert.equal(h.pager.snapshot().rows.length,n);assert.equal(new Set(h.pager.snapshot().rows.map(r=>r.id)).size,n);
  assert.equal(h.calls.length,Math.max(1,Math.ceil(n/100)));h.pager.dispose();
});
for(const mutation of ['DELETE','INSERT','UPDATE','REORDER','STATUS','PERMISSION'])test(`revision mismatch reconciles ${mutation} atomically`,async()=>{
  const h=harness();await h.pager.load(global);
  h.mutate(rows=>{
    if(mutation==='DELETE'||mutation==='PERMISSION')return rows.filter(row=>row.id!=='1');
    if(mutation==='INSERT')return[{id:'new',values:{order:0,status:'Todo'}},...rows];
    return rows.map(row=>row.id==='101'?{...row,values:{...row.values,order:mutation==='REORDER'?0:row.values.order,status:mutation==='STATUS'?'Done':row.values.status,name:'changed'}}:row);
  });
  await h.pager.load(global,true);
  assert.equal(h.pager.snapshot().dirty,false);
  assert.equal(h.published.length,2); // initial page + one complete replacement
  while(h.pager.snapshot().global.hasMore)await h.pager.load(global,true);
  assert.deepEqual(new Set(h.pager.snapshot().rows.map(r=>r.id)),new Set(h.data.map(r=>r.id)));
});
test('column scope uses cached global prefix; view switch makes no request',async()=>{
  const h=harness(1000);await h.pager.load(global);const before=h.calls.length;
  await h.pager.load(global);assert.equal(h.calls.length,before);
  await h.pager.load({statusColumnId:'status',statusValue:'Todo'},true);
  assert.equal(h.calls.at(-1).offset,66);assert.equal(h.calls.at(-1).statusValue,'Todo');
  assert.equal(new Set(h.pager.snapshot().rows.map(r=>r.id)).size,h.pager.snapshot().rows.length);
});
test('rapid scroll shares an in-flight page',async()=>{
  const h=harness(500);await h.pager.load(global);let resume;h.delay=new Promise(r=>resume=r);
  const a=h.pager.load(global,true),b=h.pager.load(global,true);await tick();assert.equal(h.calls.length,2);resume();await Promise.all([a,b]);assert.equal(h.calls.length,2);
});
test('fully loaded columns satisfy Table traversal without downloading duplicate rows',async()=>{
  const h=harness(500);await h.pager.load(global);
  for(const status of ['Todo','Done']) {
    const params={statusColumnId:'status',statusValue:status};await h.pager.load(params,true);
    while([...h.pager.snapshot().scopes.values()].find(scope=>scope.params.statusValue===status).hasMore)await h.pager.load(params,true);
  }
  const before=h.calls.length;assert.equal(h.pager.snapshot().complete,true);
  await h.pager.load(global,true);assert.equal(h.calls.length,before);assert.equal(h.pager.snapshot().global.rows.length,500);
  await h.pager.reconcile();assert.equal(h.calls.length-before,5); // global pages reused by columns
});
test('incomplete or failed resync keeps last complete snapshot',async()=>{
  const h=harness(500);await h.pager.load(global);await h.pager.load(global,true);const before=h.pager.snapshot().rows;
  h.fail=500;await assert.rejects(h.pager.reconcile());assert.deepEqual(h.pager.snapshot().rows,before);assert.equal(h.pager.snapshot().dirty,true);
});
test('revision churn has a bounded two-attempt retry budget',async()=>{
  let calls=0,churn=false;const pager=createTaskPager({identity:{userId:'A'},onChange(){},fetchPage:async p=>{calls++;if(churn&&p.revision)return{ok:false,status:409};return{ok:true,status:200,json:async()=>({rows:Array.from({length:100},(_,i)=>({id:String(p.offset+i),values:{}})),total:500,hasMore:true,revision:churn?String(calls):'1'})};}});
  await pager.load();await pager.load({},true);churn=true;await assert.rejects(pager.reconcile());assert.equal(calls,6);
});
test('late 403 after dispose cannot clear a newer UI state',async()=>{
  const h=harness();await h.pager.load(global);let resume;h.delay=new Promise(r=>resume=r);h.fail=403;
  const promise=h.pager.load(global,true);await tick();const before=h.published.length;h.pager.dispose();resume();await assert.rejects(promise,{name:'AbortError'});assert.equal(h.published.length,before);
});
test('current permission denial clears all cached scopes',async()=>{
  const h=harness();await h.pager.load(global);h.fail=403;await assert.rejects(h.pager.reconcile(),{name:'AccessError'});assert.equal(h.pager.snapshot().rows.length,0);
});
test('optimistic values survive a successful reconciliation',async()=>{
  const h=harness();await h.pager.load(global);h.pending.set('1:name',{value:'optimistic'});await h.pager.reconcile();assert.equal(h.pager.snapshot().rows.find(r=>r.id==='1').values.name,'optimistic');
});
test('session instances cannot share rows',async()=>{const a=harness(1),b=harness(0);await a.pager.load(global);await b.pager.load(global);assert.equal(a.pager.snapshot().rows.length,1);assert.equal(b.pager.snapshot().rows.length,0);});
test('equivalent scope key ordering cannot duplicate a page',async()=>{const h=harness(1);await h.pager.load({statusColumnId:'status',statusValue:'Done'});await h.pager.load({statusValue:'Done',statusColumnId:'status'});assert.equal(h.calls.length,1);});
test('initial realtime failure cannot lose the in-flight global scope',async()=>{
  const h=harness(500);let resume;h.delay=new Promise(r=>resume=r);
  const initial=h.pager.load(global);await tick();h.pager.invalidate();resume();
  await assert.rejects(initial,{name:'AbortError'});h.delay=null;
  await h.pager.load(global);
  assert.equal(h.pager.snapshot().total,500);
  assert.equal(h.pager.snapshot().global.rows.length,100);
  assert.deepEqual(h.pager.snapshot().statusCounts,{Done:167,Todo:333});
});
test('initial unavailable subscription does not duplicate or abort initial loading',async()=>{
  const h=harness(500);let resume;h.delay=new Promise(r=>resume=r);const first=h.pager.load(global);await tick();
  const timers=[];const life=createRecoveryLifecycle({pager:h.pager,schedule:fn=>(timers.push(fn),timers.length),unschedule(){}});life.status('CHANNEL_ERROR');assert.equal(h.calls[0].signal.aborted,false);resume();await first;assert.equal(h.calls.length,1);assert.equal(timers.length,0);life.dispose();
});
test('background loading pauses while hidden and resumes once visible',async()=>{
  const h=harness(250);await h.pager.load(global);h.hidden=true;
  let settled=false;
  const loading=h.pager.loadAll(global,{onProgress:()=>{}}).then(()=>{settled=true;});
  await tick();
  assert.equal(h.calls.length,1);assert.equal(settled,false);
  h.hidden=false;h.pager.resume();await loading;
  assert.equal(h.pager.snapshot().rows.length,250);assert.equal(h.calls.length,3);
  h.pager.dispose();
});
test('background loading stops cleanly on cancellation while hidden',async()=>{
  const h=harness(250);await h.pager.load(global);h.hidden=true;
  const loading=h.pager.loadAll(global);
  await tick();h.pager.dispose();await loading;
  assert.equal(h.calls.length,1);
});
test('background loading rejects repeated zero-progress pages instead of looping',async()=>{
  let calls=0;
  const pager=createTaskPager({identity:{userId:'A'},isHidden:()=>false,onChange(){},fetchPage:async()=>{
    calls++;
    return {ok:true,status:200,json:async()=>calls===1
      ? {rows:[{id:'1',values:{}}],total:2,hasMore:true,revision:'1'}
      : {rows:[],total:2,hasMore:true,revision:'1'}};
  }});
  await pager.load(global);
  await assert.rejects(pager.loadAll(global),/Non-progressing task page/);
  assert.equal(calls,5);pager.dispose();
});
test('reconnect before first polling tick removes deleted rows with one resync',async()=>{
  const h=harness(1);await h.pager.load(global);const timers=[];
  const life=createRecoveryLifecycle({pager:h.pager,schedule:fn=>(timers.push(fn),timers.length),unschedule(){}});
  life.status('SUBSCRIBED');await tick();assert.equal(h.calls.length,1);
  life.status('CHANNEL_ERROR');h.mutate(()=>[]);life.status('SUBSCRIBED');life.status('SUBSCRIBED');await tick();
  assert.equal(h.calls.length,2);assert.equal(h.pager.snapshot().rows.length,0);life.dispose();
});
test('hidden reconnect waits for visibility and unmount stops recovery',async()=>{
  const h=harness(1);await h.pager.load(global);h.hidden=true;
  const life=createRecoveryLifecycle({pager:h.pager,visible:()=>!h.hidden,schedule:()=>1,unschedule(){}});
  life.status('SUBSCRIBED');life.status('CHANNEL_ERROR');life.status('SUBSCRIBED');await tick();assert.equal(h.calls.length,1);
  h.hidden=false;life.resume();await tick();assert.equal(h.calls.length,2);life.dispose();life.status('CHANNEL_ERROR');life.resume();await tick();assert.equal(h.calls.length,2);
});
test('rapid reconnect invalidates delayed responses and finishes queued recovery',async()=>{
  const h=harness(1);await h.pager.load(global);let resume;h.delay=new Promise(r=>resume=r);
  const life=createRecoveryLifecycle({pager:h.pager,schedule:()=>1,unschedule(){}});
  life.status('SUBSCRIBED');life.status('CHANNEL_ERROR');life.status('SUBSCRIBED');await tick();
  life.status('CHANNEL_ERROR');h.mutate(()=>[]);life.status('SUBSCRIBED');resume();await tick();await tick();
  assert.equal(h.pager.snapshot().rows.length,0);assert.ok(h.calls.length<=3);life.dispose();
});
