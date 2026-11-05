import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { expect } from '@playwright/test';
import fs from 'node:fs';

// Called only after the installed-runner loopback and outbound-firewall guards.
export async function installedKanbanNotification(page) {
  const database = new URL(process.env.DATABASE_URL || '');
  if (database.hostname !== '127.0.0.1' || database.pathname !== '/smart_manage_portal_acceptance') throw Error('Synthetic database required');
  const backend = new URL(process.env.NEXT_PUBLIC_API_URL || '');
  if (backend.hostname !== '127.0.0.1' || backend.protocol !== 'http:') throw Error('Loopback API required');
  const client = new pg.Client({connectionString: database.href, ssl:false});
  await client.connect();
  const workspace=randomUUID(), table=randomUUID(), name=randomUUID(), status=randomUUID();
  const marker=`INSTALLED_UI_${Date.now()}`;
  const boardName=`${marker} Board`;
  const userId=await page.evaluate(()=>String(JSON.parse(localStorage.getItem('user') || '{}').id || ''));
  if (!userId) throw Error('Installed login identity missing');
  const pendingMutations=new Set();const mutationEvidence=[];
  const onRequest=request=>{if(request.method()==='PATCH' && request.url().includes(`/api/tables/${table}/tasks/`)){pendingMutations.add(request);mutationEvidence.push({method:request.method(),path:new URL(request.url()).pathname,body:request.postDataJSON()});}};
  const onFinished=request=>pendingMutations.delete(request);
  page.on('request',onRequest);page.on('requestfinished',onFinished);page.on('requestfailed',onFinished);
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO workspaces(id,name,owner_id,is_demo,demo_expires_at,demo_metadata) VALUES($1,$2,$3,TRUE,NOW()+INTERVAL '1 hour','{}'::jsonb)",[workspace,`${marker} Workspace`,userId]);
    await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,record_access,updated_at) VALUES($1,$2,'admin','admin','{"scope":"all_permitted"}',NOW())`,[workspace,userId]);
    const columns=[{id:name,name:'Name',type:'Text',order:0},{id:status,name:'Status',type:'Status',order:1,options:[{value:'Open',color:'#1976d2'},{value:'Done',color:'#00c875'}]}];
    await client.query('INSERT INTO tables(id,name,workspace_id,columns) VALUES($1,$2,$3,$4::jsonb)',[table,boardName,workspace,JSON.stringify(columns)]);
    await client.query(`INSERT INTO board_member_access(table_id,user_id,board_role,capabilities,record_access,updated_at) VALUES($1,$2,'owner','{}','{"scope":"all_permitted"}',NOW())`,[table,userId]);
    await client.query('COMMIT');
    const open=async()=>{
      await page.goto(`app://localhost/workspace.html?id=${workspace}`);
      await page.getByText(boardName,{exact:true}).click();
      const toolbar=page.getByRole('button',{name:'New task',exact:true});
      await expect(toolbar).toBeVisible({timeout:30000});
      await toolbar.locator('xpath=preceding-sibling::button[1]').click();
      await page.getByRole('menu').getByText('Kanban',{exact:true}).click();
      await expect(page.locator('[data-rfd-droppable-id^="kanban:"]').first()).toBeVisible({timeout:30000});
    };
    await open();
    const responsePromise=page.waitForResponse(r=>r.request().method()==='POST' && new URL(r.url()).pathname.replace(/\/$/,'')===`/api/tables/${table}/tasks`);
    await page.getByRole('button',{name:/^New Task$/i}).last().click();
    const response=await responsePromise;
    expect(response.ok()).toBe(true);
    const row=await response.json();
    const dialog=page.getByRole('dialog').last();
    const field=dialog.getByPlaceholder('Empty').first();
    await field.fill(`${marker} created`);await field.press('Enter');
    await expect.poll(async()=>(await client.query('SELECT values FROM rows WHERE id=$1',[row.id])).rows[0]?.values[name]).toBe(`${marker} created`);
    // Preserve the rapid-edit regression: older create-save acknowledgements
    // must not erase the next typed value in the installed application's UI.
    await field.fill(`${marker} edited`);await field.press('Enter');
    await expect.poll(async()=>(await client.query('SELECT values FROM rows WHERE id=$1',[row.id])).rows[0]?.values[name]).toBe(`${marker} edited`);
    await dialog.getByRole('button').filter({hasText:'×'}).click();
    const card=page.locator(`[data-rfd-draggable-id="${row.id}"]`);
    await card.focus();await card.press('Space');await card.press('ArrowLeft');await card.press('Space');
    await expect.poll(async()=>(await client.query('SELECT values FROM rows WHERE id=$1',[row.id])).rows[0]?.values[status]).toBe('Open');
    await open();
    await expect(page.locator('[data-rfd-droppable-id="kanban:Open"]').getByText(`${marker} edited`,{exact:true})).toBeVisible();

    // A different synthetic editor generates a genuine task-update notification.
    const login=await fetch(new URL('/api/login/',backend),{method:'POST',headers:{'Content-Type':'application/json',Origin:backend.origin},body:JSON.stringify({email:'driver-b@smartmanage-demo.com',password:process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD})});
    expect(login.status).toBe(200);const actor=await login.json();
    await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,record_access,updated_at) VALUES($1,$2,'member','member','{"scope":"all_permitted"}',NOW())`,[workspace,actor.user.id]);
    await client.query(`INSERT INTO board_member_access(table_id,user_id,board_role,capabilities,record_access,updated_at) VALUES($1,$2,'editor','{}','{"scope":"all_permitted"}',NOW())`,[table,actor.user.id]);
    const values=(await client.query('SELECT values FROM rows WHERE id=$1',[row.id])).rows[0].values;
    const update=await fetch(new URL(`/api/tables/${table}/tasks/`,backend),{method:'PUT',headers:{Authorization:`Bearer ${actor.token}`,'Content-Type':'application/json'},body:JSON.stringify({id:row.id,values:{...values,[name]:`${marker} notified`}})});
    expect(update.ok).toBe(true);
    let notification;
    await expect.poll(async()=>{notification=(await client.query("SELECT id,read FROM notifications WHERE recipient_id=$1 AND type='record_update' AND data->>'taskId'=$2",[userId,row.id])).rows[0];return Boolean(notification);},{timeout:30000}).toBe(true);
    expect(notification.read).toBe(false);
    await page.getByRole('button',{name:'Notifications',exact:true}).click();
    // Realtime is unavailable in this exact production-configured EXE under
    // outbound isolation. TopBar's supported fallback interval is 90 seconds.
    await expect(page.getByRole('menu').getByText(`${boardName} updated`,{exact:true})).toBeVisible({timeout:140000});
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Notifications',exact:true}).click();
    await expect.poll(async()=>(await client.query('SELECT read FROM notifications WHERE id=$1',[notification.id])).rows[0]?.read).toBe(true);
    await page.screenshot({path:'artifacts/windows-functional/installed-kanban-notification.png'});
    await page.keyboard.press('Escape');
    fs.writeFileSync('artifacts/windows-functional/installed-ui.json',JSON.stringify({uiCreate:true,uiEdit:true,keyboardDrag:true,persistReload:true,notificationEvent:true,notificationUI:true,notificationRead:true,notificationTransport:'90-second fallback polling; realtime unavailable under outbound isolation',OSPush:'NOT TESTED'}));
  } catch(error) {
    await page.screenshot({path:'artifacts/windows-functional/installed-ui-failure.png'}).catch(()=>{});
    fs.writeFileSync('artifacts/windows-functional/installed-ui-failure.json',JSON.stringify({message:error.message,stack:error.stack}));
    throw error;
  } finally {
    fs.writeFileSync('artifacts/windows-functional/ui-mutation-requests.json',JSON.stringify(mutationEvidence));
    page.off('request',onRequest);page.off('requestfinished',onFinished);page.off('requestfailed',onFinished);
    await client.query('ROLLBACK').catch(()=>{});
    await client.query("DELETE FROM notifications WHERE data->>'workspaceId'=$1",[workspace]);
    await client.query('DELETE FROM workspaces WHERE id=$1',[workspace]);await client.end();
  }
}
