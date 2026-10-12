const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const lines=fs.readFileSync('.github/workflows/manual-production-migrations.yml','utf8').split(/\r?\n/);
const scripts=[];
for(let i=0;i<lines.length;i++) if(lines[i]==='          script: |') {
  const code=[];while(++i<lines.length && (lines[i].startsWith('            ') || !lines[i].trim())) code.push(lines[i].slice(12));
  scripts.push(code.join('\n'));i--;
}
const sha='a'.repeat(40);
const env={id:42,name:'Production',can_admins_bypass:false,protection_rules:[{type:'required_reviewers',prevent_self_review:true,reviewers:[{type:'User',reviewer:{id:2,login:'reviewer'}}]}]};
const context={repo:{owner:'test',repo:'isolated'},ref:'refs/heads/main',sha,actor:'initiator',runId:12};
function run(index,{environment=env,branch={protected:true},reviews=[{state:'approved',user:{id:2,login:'reviewer'},environments:[{id:42,name:'Production'}]}],status,errorStage='environment',actor='initiator',runAttempt=1,triggeringActor='initiator'}={}) {
  const calls=[];
  const failure=()=>{const error=new Error('permission denied');error.status=status;throw error;};
  const github={rest:{actions:{getWorkflowRun:async()=>{if(status&&errorStage==='run')failure();return {data:{run_attempt:runAttempt,actor:{login:'initiator'},triggering_actor:{login:triggeringActor}}};}},repos:{getEnvironment:async()=>{calls.push('environment');if(status&&errorStage==='environment')failure();return {data:environment};},getBranch:async()=>{calls.push('branch');if(status&&errorStage==='branch')failure();return {data:branch};}}},request:async()=>{calls.push('approvals');if(status&&errorStage==='approvals')failure();return {data:reviews};}};
  return vm.runInNewContext(`(async()=>{${scripts[index]}})()`,{github,context:{...context,actor},process:{env:{ENABLED:'1',APPROVED_SHA:sha}}});
}
test('preflight accepts documented GitHub environment response with protections',async()=>{await run(0);});
for(const [name,value] of [ ['reviewer missing',{...env,protection_rules:[]}],['self-review enabled',{...env,protection_rules:[{...env.protection_rules[0],prevent_self_review:false}]}],['admin bypass',{...env,can_admins_bypass:true}],['bypass field missing',{...env,can_admins_bypass:undefined}],['malformed reviewers',{...env,protection_rules:[{...env.protection_rules[0],reviewers:[]}]}] ]) test(`preflight refuses ${name}`,async()=>{await assert.rejects(()=>run(0,{environment:value}));});
test('preflight refuses unprotected main',async()=>{await assert.rejects(()=>run(0,{branch:{protected:false}}));});
for(const status of [403,404]) for(const stage of ['environment','branch']) test(`preflight refuses ${stage} HTTP ${status}`,async()=>{await assert.rejects(()=>run(0,{status,errorStage:stage}));});
test('approval accepts canonical Production environment',async()=>{await run(1);});
for(const [name,reviews] of [['no approval',[]],['self-review',[{state:'approved',user:{login:'initiator'},environments:[{id:42,name:'production'}]}]],['missing user',[{state:'approved',environments:[{id:42,name:'production'}]}]],['other environment',[{state:'approved',user:{id:2,login:'reviewer'},environments:[{id:43,name:'preview'}]}]],['rejected',[{state:'rejected',user:{id:2,login:'reviewer'},environments:[{id:42,name:'production'}]}]]]) test(`approval refuses ${name}`,async()=>{await assert.rejects(()=>run(1,{reviews}));});
for(const status of [403,404]) test(`approval refuses API HTTP ${status}`,async()=>{await assert.rejects(()=>run(1,{status,errorStage:'approvals'}));});
test('approval refuses previous attempt history',async()=>{await assert.rejects(()=>run(1,{runAttempt:2}));});
test('approval refuses triggering actor and missing user ID',async()=>{
  await assert.rejects(()=>run(1,{triggeringActor:'reviewer'}));
  await assert.rejects(()=>run(1,{reviews:[{state:'approved',user:{login:'reviewer'},environments:[{id:42,name:'Production'}]}]}));
});
test('preflight refuses malformed reviewer object and nonboolean protection',async()=>{
  await assert.rejects(()=>run(0,{environment:{...env,protection_rules:[{...env.protection_rules[0],reviewers:[{}]}]}}));
  await assert.rejects(()=>run(0,{branch:{protected:'false'}}));
});
test('approval refuses malformed API payload and conflicting rejection',async()=>{
  await assert.rejects(()=>run(1,{reviews:{}}));
  await assert.rejects(()=>run(1,{reviews:[{state:'approved',user:{id:2,login:'reviewer'},environments:[{id:42,name:'Production'}]},{state:'rejected',environments:[{id:42,name:'Production'}]}]}));
});
test('credentials occur only in final migration step after approval gate',()=>{
  const workflow=lines.join('\n');
  const before=workflow.split('      - name: Execute approved migration plan')[0];
  assert.equal(before.includes('secrets.'),false);
  assert.match(workflow,/needs: protection-preflight/);
  assert.match(workflow,/environment: production/);
});
