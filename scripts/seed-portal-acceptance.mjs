import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import pg from "pg";
import { verifyDemoDatabaseTarget } from "./verify-demo-database-target.mjs";

const PASSWORD_ENV = "SMART_MANAGE_PORTAL_TEST_PASSWORD";
const accounts = {
  driverA:["driver-a@smartmanage-demo.com","Driver A"],driverB:["driver-b@smartmanage-demo.com","Driver B"],manager:["portal-manager@smartmanage-demo.com","Portal Manager"],
  teacherA:["teacher-a@smartmanage-demo.com","Teacher A"],teacherB:["teacher-b@smartmanage-demo.com","Teacher B"],parentA:["parent-a@smartmanage-demo.com","Parent A"],parentB:["parent-b@smartmanage-demo.com","Parent B"],
  doctorA:["doctor-a@smartmanage-demo.com","Doctor A"],doctorB:["doctor-b@smartmanage-demo.com","Doctor B"],patientA:["patient-a@smartmanage-demo.com","Patient A"],patientB:["patient-b@smartmanage-demo.com","Patient B"],
  clientA:["client-a@smartmanage-demo.com","Client A"],clientB:["client-b@smartmanage-demo.com","Client B"],
};
const roles = {
  driverA:["fleet","driver","member","driver"],driverB:["fleet","driver","member","driver"],manager:["fleet","logistics_admin","admin","manager"],
  teacherA:["daycare","teacher","member","teacher"],teacherB:["daycare","teacher","member","teacher"],parentA:["daycare","parent","guest","parent"],parentB:["daycare","parent","guest","parent"],
  doctorA:["dental","dentist","member","doctor"],doctorB:["dental","dentist","member","doctor"],patientA:["dental","patient","guest","patient"],patientB:["dental","patient","guest","patient"],
  clientA:["freight","client","guest","client"],clientB:["freight","client","guest","client"],
};
const scopeFor = (portal) => portal === "driver" ? {scope:"assigned_to_me",field:"_assignedDriverUserId"} : portal === "teacher" ? {scope:"assigned_to_me",field:"_classTeacherUserId"} : portal === "doctor" ? {scope:"assigned_to_me",field:"_assignedDoctorUserId"} : portal === "client" ? {scope:"my_company",field:"clientCompanyId"} : {scope:"custom",rule:{field:portal === "parent" ? "_linkedParentUserId" : "_linkedPatientUserId",value:"$current_user"}};
const landing = (portal) => portal === "driver" ? "/driver-trips" : `/portal/${portal}`;
const col = (table,name) => (table.columns || []).find((item) => String(item.name).toLowerCase() === name.toLowerCase());
const person = (id,[email,name]) => [{id,userId:id,email,name}];

async function ensureAccount(client,key,password) {
  const [email,name] = accounts[key];
  let user = (await client.query("SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1",[email])).rows[0];
  if (!user) { user={id:randomUUID()}; await client.query("INSERT INTO users(id,name,email,password,email_verified_at) VALUES($1,$2,$3,$4,NOW())",[user.id,name,email,await bcrypt.hash(password,12)]); }
  const unsafe = await client.query("SELECT 1 FROM workspaces w LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$1::text WHERE (w.owner_id::text=$1::text OR wm.user_id IS NOT NULL) AND w.is_demo IS NOT TRUE LIMIT 1",[user.id]);
  if (unsafe.rowCount) throw new Error(`Refusing portal test account with non-demo access: ${email}`);
  // Acceptance credentials are environment-only and may be rotated between runs.
  // Synchronize them only after proving this identity cannot access production data.
  if (user) await client.query("UPDATE users SET password=$1,email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$2",[await bcrypt.hash(password,12),user.id]);
  return user.id;
}
async function boards(client,workspaceId) { return (await client.query("SELECT id,name,columns FROM tables WHERE workspace_id=$1",[workspaceId])).rows; }
async function rows(client,table) { return (await client.query("SELECT id,values FROM rows WHERE table_id=$1 ORDER BY created_at,id",[table.id])).rows; }
async function patchRow(client,row,patch) { await client.query("UPDATE rows SET values=values||$1::jsonb,updated_at=NOW() WHERE id=$2",[JSON.stringify(patch),row.id]); }

export async function seedPortalAcceptance({connectionString=process.env.DATABASE_URL,password=process.env[PASSWORD_ENV],env=process.env}={}) {
  if (!password || password.length < 24) throw new Error(`${PASSWORD_ENV} must be at least 24 characters`);
  await verifyDemoDatabaseTarget({connectionString,env});
  const manifest=JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)),".marketing-demo-manifest.json"),"utf8"));
  const pool=new pg.Pool({connectionString,ssl:env.DATABASE_SSL==="false"?false:{rejectUnauthorized:false}}); const client=await pool.connect();
  try { await client.query("BEGIN"); const ids={}; for (const key of Object.keys(accounts)) ids[key]=await ensureAccount(client,key,password);
    for (const [key,[workspaceKey,jobRole,workspaceRole,portal]] of Object.entries(roles)) {
      const workspaceId=manifest.workspaces?.[workspaceKey]?.workspaceId; if(!workspaceId) throw new Error(`Missing demo workspace ${workspaceKey}`);
      const workspace=(await client.query("SELECT is_demo FROM workspaces WHERE id=$1 FOR UPDATE",[workspaceId])).rows[0]; if(workspace?.is_demo!==true) throw new Error(`Refusing non-demo workspace ${workspaceId}`);
      await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,job_roles,primary_job_role,portal_type,permitted_portals,landing_route,record_access,company_id,updated_at)
        VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10::jsonb,NULL,NOW()) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role,workspace_role=EXCLUDED.workspace_role,job_roles=EXCLUDED.job_roles,primary_job_role=EXCLUDED.primary_job_role,portal_type=EXCLUDED.portal_type,permitted_portals=EXCLUDED.permitted_portals,landing_route=EXCLUDED.landing_route,record_access=EXCLUDED.record_access,updated_at=NOW()`,[workspaceId,ids[key],jobRole,workspaceRole,JSON.stringify([jobRole]),jobRole,portal,JSON.stringify([portal]),landing(portal),JSON.stringify(scopeFor(portal))]);
      const role=workspaceRole==="manager"?"owner":(["teacher","doctor"].includes(portal)?"editor":"viewer"); for(const table of await boards(client,workspaceId)) await client.query("INSERT INTO board_member_access(table_id,user_id,board_role,capabilities,record_access,updated_at) VALUES($1,$2,$3,'{}'::jsonb,$4::jsonb,NOW()) ON CONFLICT(table_id,user_id) DO UPDATE SET board_role=EXCLUDED.board_role,record_access=EXCLUDED.record_access,updated_at=NOW()",[table.id,ids[key],role,JSON.stringify(scopeFor(portal))]);
    }
    for (const workspaceKey of ["daycare","dental","freight"]) {
      const workspaceId=manifest.workspaces[workspaceKey].workspaceId;
      await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,job_roles,primary_job_role,portal_type,permitted_portals,landing_route,record_access,updated_at)
        VALUES($1,$2,'admin','admin','["manager"]'::jsonb,'manager','manager','["manager"]'::jsonb,'/workspace','{"scope":"all"}'::jsonb,NOW())
        ON CONFLICT(workspace_id,user_id) DO UPDATE SET role='admin',workspace_role='admin',job_roles='["manager"]'::jsonb,primary_job_role='manager',portal_type='manager',permitted_portals='["manager"]'::jsonb,landing_route='/workspace',record_access='{"scope":"all"}'::jsonb,updated_at=NOW()`,[workspaceId,ids.manager]);
      for(const table of await boards(client,workspaceId)) await client.query("INSERT INTO board_member_access(table_id,user_id,board_role,capabilities,record_access,updated_at) VALUES($1,$2,'owner','{}'::jsonb,'{\"scope\":\"all\"}'::jsonb,NOW()) ON CONFLICT(table_id,user_id) DO UPDATE SET board_role='owner',record_access='{\"scope\":\"all\"}'::jsonb,updated_at=NOW()",[table.id,ids.manager]);
    }
    const link = async (workspaceKey,tableName,userKeys,patcher) => { const workspaceId=manifest.workspaces[workspaceKey].workspaceId; const table=(await boards(client,workspaceId)).find((item)=>item.name===tableName); const records=await rows(client,table); for(let i=0;i<Math.min(userKeys.length,records.length);i++) await patchRow(client,records[i],patcher(ids[userKeys[i]],accounts[userKeys[i]],records[i],table,i)); return {table,records}; };
    const drivers=await link("fleet","Drivers",["driverA","driverB"],(id)=>({_linkedUserId:id})); await link("fleet","Trips",["driverA","driverB"],(id,_,row,table,i)=>({_workspaceId:manifest.workspaces.fleet.workspaceId,_assignedDriverUserId:id,_assignedDriverProfileId:drivers.records[i]?.id}));
    const groups=await link("daycare","Groups",["teacherA","teacherB"],(id,account,row,table)=>({[col(table,"Educator")?.id]:person(id,account),_classTeacherUserId:id})); await link("daycare","Parents",["parentA","parentB"],(id)=>({_linkedUserId:id})); const children=await link("daycare","Children",["parentA","parentB"],(id,_,row,table,i)=>({_linkedParentUserId:id,_classTeacherUserId:ids[i===0?"teacherA":"teacherB"],[col(table,"Group")?.id]:[{tableId:groups.table.id,rowId:groups.records[i]?.id,label:`Acceptance Group ${i+1}`,tableName:"Groups"}]})); for(const name of ["Attendance","Documents","Payments"]) await link("daycare",name,["parentA","parentB"],(id,_,row,table,i)=>({_linkedParentUserId:id,_classTeacherUserId:ids[i===0?"teacherA":"teacherB"],[col(table,"Child")?.id]:[{tableId:children.table.id,rowId:children.records[i]?.id,label:`Acceptance Child ${i+1}`,tableName:"Children"}]})); await link("daycare","Meals",["parentA","parentB"],(id,_,row,table,i)=>({_linkedParentUserId:id,educatorUserId:ids[i===0?"teacherA":"teacherB"],[col(table,"Assigned Groups")?.id]:[{tableId:groups.table.id,rowId:groups.records[i]?.id,label:`Acceptance Group ${i+1}`,tableName:"Groups"}]})); await link("daycare","Activities",["parentA","parentB"],(id,_,row,table,i)=>({_linkedParentUserId:id,_classTeacherUserId:ids[i===0?"teacherA":"teacherB"],[col(table,"Group")?.id]:[{tableId:groups.table.id,rowId:groups.records[i]?.id,label:`Acceptance Group ${i+1}`,tableName:"Groups"}],[col(table,"Children")?.id]:[{tableId:children.table.id,rowId:children.records[i]?.id,label:`Acceptance Child ${i+1}`,tableName:"Children"}]}));
    const patients=await link("dental","Patients",["patientA","patientB"],(id,_,row,table,i)=>({_linkedUserId:id,_linkedPatientUserId:id,_assignedDoctorUserId:ids[i===0?"doctorA":"doctorB"]})); for(const name of ["Appointments","Treatments"]) await link("dental",name,["doctorA","doctorB"],(id,account,row,table,i)=>({[col(table,"Dentist")?.id]:person(id,account),[col(table,"Patient")?.id]:[{tableId:patients.table.id,rowId:patients.records[i]?.id,label:`Acceptance Patient ${i+1}`,tableName:"Patients"}],_assignedDoctorUserId:id,_linkedPatientUserId:ids[i===0?"patientA":"patientB"]})); for(const name of ["Lab Requests","Documents","Dental Billing"]) await link("dental",name,["patientA","patientB"],(id,_,row,table,i)=>({[col(table,"Patient")?.id]:[{tableId:patients.table.id,rowId:patients.records[i]?.id,label:`Acceptance Patient ${i+1}`,tableName:"Patients"}],_linkedPatientUserId:id,_assignedDoctorUserId:ids[i===0?"doctorA":"doctorB"],...(name==="Documents"?{[col(table,"Visibility")?.id]:"Shared",[col(table,"Status")?.id]:"Shared"}:{})}));
    const clients=await link("freight","Clients",["clientA","clientB"],(id)=>({_linkedUserId:id})); for(const name of ["Loads","Invoices","Documents"]) await link("freight",name,["clientA","clientB"],(id,_,row,table,i)=>({clientCompanyId:clients.records[i]?.id})); for(const key of ["clientA","clientB"]) await client.query("UPDATE workspace_members SET company_id=$1 WHERE workspace_id=$2 AND user_id=$3",[clients.records[key==="clientA"?0:1]?.id,manifest.workspaces.freight.workspaceId,ids[key]]);
    await client.query("COMMIT"); return {accounts:Object.fromEntries(Object.entries(accounts).map(([key,[email]])=>[key,email])),workspaces:Object.fromEntries(Object.entries(manifest.workspaces).filter(([key])=>["fleet","daycare","dental","freight"].includes(key)).map(([key,value])=>[key,value.workspaceId]))};
  } catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;} finally{client.release();await pool.end();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) seedPortalAcceptance().then(()=>console.log("Portal acceptance demo identities and relationships are ready.")).catch((error)=>{console.error(`Portal acceptance seed failed: ${error.message}`);process.exitCode=1;});
