import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs';

const backend=new URL(process.env.NEXT_PUBLIC_API_URL || '');
if(backend.origin!=='http://10.0.2.2:3000') throw Error('Android emulator host backend required');
const database=new URL(process.env.DATABASE_URL || '');
if(database.hostname!=='127.0.0.1'||database.pathname!=='/smart_manage_portal_acceptance') throw Error('Isolated database required');
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8'});
adb('logcat','-c');
adb('shell','am','start','-n','com.smartmanage.app/.MainActivity');
let socket;
for(let n=0;n<40;n++){
  const sockets=adb('shell','cat','/proc/net/unix');
  socket=sockets.match(/@(webview_devtools_remote_[\w.]+)/)?.[1];
  if(socket)break;
  await new Promise(r=>setTimeout(r,500));
}
if(!socket)throw Error('Debug APK WebView DevTools unavailable');
adb('forward','tcp:9222',`localabstract:${socket}`);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
try{
  const context=browser.contexts()[0];
  const denied=[];
  await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(['localhost','127.0.0.1','10.0.2.2'].includes(u.hostname)||['data:','blob:','capacitor:'].includes(u.protocol))return route.continue();
    denied.push(u.origin);return route.abort();
  });
  const page=context.pages()[0];
  if(!page)throw Error('Application WebView missing');
  await page.goto('http://localhost/login.html');
  await page.getByLabel(/email/i).fill('demo@smartmanage.com');
  await page.getByRole('textbox',{name:/^password$/i}).fill(process.env.SMART_MANAGE_DEMO_PASSWORD);
  await page.getByRole('button',{name:/sign in|login/i}).click();
  await page.waitForURL(url=>!url.pathname.includes('login'),{timeout:30000});
  const workspaces=await page.evaluate(async origin=>{
    const r=await fetch(`${origin}/api/workspaces`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
    if(!r.ok)throw Error(`Workspace API ${r.status}`);
    const rows=await r.json();if(!Array.isArray(rows)||!rows.length)throw Error('Synthetic workspace missing');return rows.length;
  },backend.origin);
  if(denied.length)throw Error('Unexpected nonlocal requests blocked');
  fs.mkdirSync('artifacts/android-functional',{recursive:true});
  await page.screenshot({path:'artifacts/android-functional/authenticated.png'});
  fs.writeFileSync('artifacts/android-functional/result.json',JSON.stringify({emulator:true,physicalDevice:false,loginUI:true,workspaceAPI:true,workspaces,tasks:'NOT TESTED',reconnect:'NOT TESTED',notifications:'NOT TESTED'}));
}finally{await browser.close();}
