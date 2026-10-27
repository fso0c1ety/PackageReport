const test=require('node:test');
const assert=require('node:assert/strict');
const {createTaskPager,createRecoveryLifecycle}=require('../src/app/board/taskPageCache.cjs');
const tick=async()=>{for(let i=0;i<50;i++)await Promise.resolve();};
function fixture(count=250){
  const calls=[];let rows=Array.from({length:count},(_,i)=>({id:String(i),values:{order:i,status:i%2?'A':'B'}}));let revision=1;
  const pager=createTaskPager({identity:{userId:'test',workspaceId:'w',tableId:'t'},onChange(){},
    fetchPage:async p=>{calls.push(p);if(p.revision&&p.revision!==String(revision))return{status:409,ok:false};
      const selected=p.statusValue===undefined?rows:rows.filter(r=>r.values.status===p.statusValue);
      return{ok:true,status:200,json:async()=>({revision:String(revision),rows:selected.slice(p.offset,p.offset+p.limit),total:selected.length,hasMore:p.offset+p.limit<selected.length,statusCounts:{A:Math.floor(rows.length/2),B:Math.ceil(rows.length/2)}})};
    }});
  return{pager,calls,mutate(fn){rows=fn(rows);revision++;}};
}
test('fallback recovery requests bounded pages under one verified revision',async()=>{
  const f=fixture();await f.pager.load();await f.pager.load({},true);await f.pager.load({},true);
  const before=f.calls.length;await f.pager.reconcile();
  assert.deepEqual(f.calls.slice(before).map(p=>p.offset),[0,100,200]);
  assert.ok(f.calls.every(p=>p.limit===100));assert.equal(f.pager.snapshot().rows.length,250);
});
test('fallback reconciles every loaded column without discarding its pages',async()=>{
  const f=fixture(500);await f.pager.load({statusColumnId:'status'});
  await f.pager.load({statusColumnId:'status',statusValue:'A'},true);
  await f.pager.load({statusColumnId:'status',statusValue:'B'},true);
  const before=f.pager.snapshot().rows.length;f.mutate(rows=>rows.filter(r=>r.id!=='0'));
  await f.pager.reconcile();assert.ok(f.pager.snapshot().rows.length>=before-1);
  assert.equal(f.pager.snapshot().rows.some(r=>r.id==='0'),false);assert.equal(f.pager.snapshot().scopes.size,3);
});
test('successful empty recovery clears the last visible row',async()=>{
  const f=fixture(1);await f.pager.load();f.mutate(()=>[]);await f.pager.reconcile();assert.deepEqual(f.pager.snapshot().rows,[]);
});
test('fallback timer budget stops after three disconnected attempts',async()=>{
  const f=fixture(1);await f.pager.load();const timers=[];
  const life=createRecoveryLifecycle({pager:f.pager,schedule:fn=>(timers.push(fn),timers.length),unschedule(){}});
  life.status('SUBSCRIBED');life.status('CHANNEL_ERROR');for(let i=0;i<3;i++){assert.equal(typeof timers[i],'function');timers[i]();await tick();}
  assert.equal(timers.length,3);assert.ok(f.calls.length<=4);life.dispose();
});
test('authorization failure aborts and clears scope data',async()=>{
  const f=fixture(1);await f.pager.load();let publishes=0;
  const denied=createTaskPager({identity:{userId:'denied'},onChange:s=>{assert.equal(s.rows.length,0);publishes++;},fetchPage:async()=>({status:401,ok:false})});
  await assert.rejects(denied.load(),{name:'AccessError'});assert.equal(publishes,1);
});
