const fs=require('node:fs'),{execFileSync}=require('node:child_process'),ts=require('typescript'),assert=require('node:assert/strict');
const {createTaskPager,createRecoveryLifecycle}=require('../src/app/board/taskPageCache.cjs');
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
async function main(){
  const source=execFileSync('git',['show','18fa62e213e9a378ff6c836bf77edc162cd04a2b:src/app/TableBoard.tsx'],{encoding:'utf8'});
  const start=source.indexOf('  const normalizeRealtimeRow ='),end=source.indexOf('  }, [tableId]);',start);
  const state={rows:[{id:'deleted',values:{order:1}}],calls:0};let callback;
  const context={tableId:'test',formatChatMessage:v=>v,rowsRef:{current:state.rows},totalRowsRef:{current:1},nextRowsOffsetRef:{current:1},pendingCellValuesRef:{current:new Map()},tableRealtimeChannelRef:{current:null},document:{hidden:false},AbortController,console:{warn(){}},setInterval:()=>1,clearInterval(){},getApiUrl:v=>v,setHasMoreRows(){},setRows:v=>{state.rows=typeof v==='function'?v(state.rows):v;},authenticatedFetch:async url=>url.endsWith('realtime-topic')?{ok:true,json:async()=>({topic:'local'})}:(state.calls++,{ok:true,json:async()=>({rows:[],total:0})}),acquireTableRealtimeChannel:(_a,_b,_onEvent,onStatus)=>{callback=onStatus;return{channel:{},release(){}};}};
  const js=ts.transpileModule(`function probe(){${source.slice(start,end)}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const cleanup=new Function(...Object.keys(context),js+';return probe();')(...Object.values(context));await flush();
  callback('SUBSCRIBED');callback('CHANNEL_ERROR');callback('SUBSCRIBED');await flush();
  const base={resyncRequests:state.calls,staleRows:state.rows.length};cleanup();
  let rows=[{id:'deleted',values:{order:1}}],revision='1',calls=0;
  const pager=createTaskPager({identity:{userId:'A',workspaceId:'W',tableId:'T'},onChange(){},fetchPage:async()=>{calls++;return{ok:true,status:200,json:async()=>({rows,total:rows.length,hasMore:false,revision})};}});
  await pager.load();const life=createRecoveryLifecycle({pager,schedule:()=>1,unschedule(){}});life.status('SUBSCRIBED');life.status('CHANNEL_ERROR');rows=[];revision='2';life.status('SUBSCRIBED');await flush();
  const patch={resyncRequests:calls-1,staleRows:pager.snapshot().rows.length};life.dispose();pager.dispose();
  assert.deepEqual(base,{resyncRequests:0,staleRows:1});assert.deepEqual(patch,{resyncRequests:1,staleRows:0});
  const report={BASE:base,PATCH:patch,scenario:'Disconnect/reconnect before the first polling tick',transport:'Controlled subscription callbacks executing original effect and production pager/lifecycle module'};
  fs.mkdirSync('artifacts/kanban-consistency-20261026',{recursive:true});fs.writeFileSync('artifacts/kanban-consistency-20261026/reconnect-red-green.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
