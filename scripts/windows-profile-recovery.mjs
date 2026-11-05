import {spawn} from 'node:child_process';
import fs from 'node:fs';
const [executable,stage]=process.argv.slice(2);
if(!executable || !['fresh-stable','upgrade','rollback-reinstall'].includes(stage)) throw Error('Explicit installed executable and recovery stage required');
if(process.env.NEXT_PUBLIC_FRONTEND_URL!=='http://127.0.0.1:3000') throw Error('Loopback runtime required');
const child=spawn(executable,['--remote-debugging-port=9335'],{stdio:'ignore',windowsHide:true});
let socket;
try {
  let target;
  for(let i=0;i<90;i++){
    const pages=await fetch('http://127.0.0.1:9335/json/list').then(r=>r.json()).catch(()=>[]);
    target=pages.find(p=>p.type==='page' && p.url.startsWith('app://localhost/'));
    if(target)break;await new Promise(r=>setTimeout(r,500));
  }
  if(!target)throw Error('Installed recovery renderer unavailable');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();
  socket.addEventListener('message',event=>{const r=JSON.parse(event.data);if(pending.has(r.id)){const {resolve,reject}=pending.get(r.id);pending.delete(r.id);r.error?reject(Error(JSON.stringify(r.error))):resolve(r.result);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const current=++id;pending.set(current,{resolve,reject});socket.send(JSON.stringify({id:current,method,params}));setTimeout(()=>{if(pending.has(current)){pending.delete(current);reject(Error('CDP recovery operation timed out'));}},15000).unref();});
  const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails){fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync(`evidence/profile-${stage}-exception.json`,JSON.stringify(result.exceptionDetails));throw Error(`Recovery renderer evaluation failed: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);}return result.result.value;};
  if(stage==='fresh-stable'){
    await evaluate("localStorage.setItem('themeMode','dark');localStorage.setItem('syntheticRecoveryWorkspace','isolated-workspace');true");
    await call('Page.reload');
  }
  let value;
  for(let i=0;i<30;i++){
    value=await evaluate("document.documentElement && document.readyState !== 'loading' ? ({mode:localStorage.getItem('themeMode'),workspace:localStorage.getItem('syntheticRecoveryWorkspace'),renderedTheme:document.documentElement.dataset.theme}) : null");
    if(value?.mode==='dark' && value?.workspace==='isolated-workspace' && (stage!=='upgrade' || value?.renderedTheme==='dark'))break;
    await new Promise(r=>setTimeout(r,500));
  }
  if(value?.mode!=='dark' || value?.workspace!=='isolated-workspace' || (stage==='upgrade' && value.renderedTheme!=='dark')) throw Error(`Profile recovery mismatch: ${JSON.stringify(value)}`);
  fs.mkdirSync('evidence',{recursive:true});
  fs.writeFileSync(`evidence/profile-${stage}.json`,JSON.stringify({stage,settingsRetained:true,candidateThemeConsumed:stage==='upgrade' && value.renderedTheme==='dark',encryptedSessionRecovery:'NOT TESTED',network:'External application traffic blocked before launch'}));
} finally {
  socket?.close();
  await new Promise(resolve=>{const stop=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});stop.once('exit',resolve);stop.once('error',resolve);});
}
