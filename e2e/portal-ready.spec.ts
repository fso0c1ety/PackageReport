import { expect, test, type APIRequestContext, type Browser, type BrowserContext } from "@playwright/test";

const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
const pdf = Buffer.from("%PDF-1.4\n%%EOF\n");

async function login(browser: Browser, baseURL: string, email: string) {
  const context = await browser.newContext({ baseURL });
  const response = await context.request.post(`${baseURL}/api/login/`, { data:{email,password}, headers:{Origin:baseURL} });
  const body = await response.json();
  expect(response.status(),JSON.stringify(body)).toBe(200);
  await context.setExtraHTTPHeaders({Authorization:`Bearer ${body.token}`});
  return context;
}

async function portal(context: BrowserContext, baseURL: string, portalType: string) {
  const membershipResponse = await context.request.get(`${baseURL}/api/portal-context/?portalType=${portalType}`);
  expect(membershipResponse.status()).toBe(200);
  const active=(await membershipResponse.json()).active;
  const response=await context.request.get(`${baseURL}/api/professional-portal/?workspaceId=${active.workspaceId}&portalType=${portalType}`);
  expect(response.status()).toBe(200);
  return {workspaceId:active.workspaceId,payload:await response.json()};
}

const entity = (payload:any,name:string) => payload.entities.find((item:any)=>item.entity===name);
const action = (payload:any,name:string) => payload.config.writeActions.find((item:any)=>item.id===name);

async function write(request:APIRequestContext,baseURL:string,input:{workspaceId:string;portalType:string;action:string;record?:any;subject?:any;values?:any}) {
  const response=await request.post(`${baseURL}/api/professional-portal/`,{data:{workspaceId:input.workspaceId,portalType:input.portalType,action:input.action,recordId:input.record?.id,subjectId:input.subject?.id,writeToken:(input.record||input.subject)?.writeToken,values:input.values||{}}});
  return response;
}

async function managerTables(manager:BrowserContext,baseURL:string,workspaceId:string) {
  const response=await manager.request.get(`${baseURL}/api/workspaces/${workspaceId}/tables`);
  expect(response.status()).toBe(200);
  return response.json();
}

async function managerRows(manager:BrowserContext,baseURL:string,tableId:string) {
  const response=await manager.request.get(`${baseURL}/api/tables/${tableId}/tasks`);
  expect(response.status()).toBe(200);
  return response.json();
}

async function upload(request:APIRequestContext,baseURL:string,input:{workspaceId:string;tableId?:string;rowId:string;portalType?:string;portalAction?:string;writeToken?:string;name:string;mimeType:string;buffer:Buffer}) {
  return request.post(`${baseURL}/api/upload/`,{multipart:{workspaceId:input.workspaceId,tableId:input.tableId||"",rowId:input.rowId,portalType:input.portalType||"",portalAction:input.portalAction||"",writeToken:input.writeToken||"",file:{name:input.name,mimeType:input.mimeType,buffer:input.buffer}}});
}

test.describe("final professional portal READY acceptance",()=>{
  test.setTimeout(180_000);
  test.skip(!password,"SMART_MANAGE_PORTAL_TEST_PASSWORD is required");

  test("teacher sleep, activity, daily records and parent-safe propagation",async({browser,baseURL})=>{
    const teacher=await login(browser,baseURL!,"teacher-a@smartmanage-demo.com");
    const teacherB=await login(browser,baseURL!,"teacher-b@smartmanage-demo.com");
    const parent=await login(browser,baseURL!,"parent-a@smartmanage-demo.com");
    const parentB=await login(browser,baseURL!,"parent-b@smartmanage-demo.com");
    const manager=await login(browser,baseURL!,"portal-manager@smartmanage-demo.com");
    try {
      const initial=await portal(teacher,baseURL!,"teacher");
      const parentInitial=await portal(parent,baseURL!,"parent");
      const parentChildIds=new Set(entity(parentInitial.payload,"Children").records.map((row:any)=>row.id));
      const child=entity(initial.payload,"Children").records.find((row:any)=>parentChildIds.has(row.id));
      expect(child).toBeTruthy();
      const group=entity(initial.payload,"Groups").records[0];
      expect(group).toBeTruthy();

      expect(action(initial.payload,"sleep:start")).toBeTruthy();
      expect((await write(teacher.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"teacher",action:"sleep:start",record:child})).status()).toBe(200);
      const managerTablesData=await managerTables(manager,baseURL!,initial.workspaceId);
      const childrenTable=managerTablesData.find((table:any)=>table.name==="Children");
      let managerChildren=await managerRows(manager,baseURL!,childrenTable.id);
      let rawChild=managerChildren.find((row:any)=>row.id===child.id);
      const openSleep=rawChild.values._sleepEvents?.[0];
      expect(openSleep?.startedAt).toBeTruthy();
      expect(openSleep?.endedAt).toBeNull();

      expect((await write(teacher.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"teacher",action:"sleep:end",record:child})).status()).toBe(200);
      managerChildren=await managerRows(manager,baseURL!,childrenTable.id);
      rawChild=managerChildren.find((row:any)=>row.id===child.id);
      const closedSleep=rawChild.values._sleepEvents?.[0];
      expect(closedSleep?.endedAt).toBeTruthy();
      expect(closedSleep?.durationMinutes).toBeGreaterThanOrEqual(0);

      const attendance=await write(teacher.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"teacher",action:"attendance:create",subject:child,values:{Date:new Date().toISOString(),"Present / Absent":"Present",Notes:"Parent-safe attendance"}});
      expect(attendance.status()).toBe(200);
      const meal=await write(teacher.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"teacher",action:"meal:create",subject:group,values:{Date:new Date().toISOString(),Breakfast:"Fruit",Lunch:"Pasta",Snack:"Yogurt",Allergens:"None"}});
      expect(meal.status()).toBe(200);
      const activity=await write(teacher.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"teacher",action:"activity:create",subject:group,values:{Title:"Acceptance art activity",Type:"Creative",Description:"Parent-safe activity", "Date / Time":new Date().toISOString(),Visibility:"Parent"}});
      expect(activity.status()).toBe(200);
      const activityId=(await activity.json()).recordId;

      const photoUpload=await upload(teacher.request,baseURL!,{workspaceId:initial.workspaceId,rowId:child.id,portalType:"teacher",portalAction:"photo:create",writeToken:child.writeToken,name:"daily-photo.png",mimeType:"image/png",buffer:png});
      expect(photoUpload.status(),await photoUpload.text()).toBe(200);
      const photo=await photoUpload.json();
      const photoRow=await write(teacher.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"teacher",action:"photo:create",subject:child,values:{"Document Type":"Daily Photo",File:photo,Visibility:"Shared",Status:"Shared"}});
      expect(photoRow.status()).toBe(200);
      const photoRowId=(await photoRow.json()).recordId;

      const parentAfter=await portal(parent,baseURL!,"parent");
      const timeline=parentAfter.payload.timeline;
      for(const type of ["Attendance","Meals","Sleep","Activities","Photo / Document"]) expect(timeline.some((event:any)=>event.type===type),`missing ${type}`).toBe(true);
      expect(timeline.every((event:any,index:number)=>index===0||new Date(timeline[index-1].at).getTime()>=new Date(event.at).getTime())).toBe(true);
      expect(JSON.stringify(parentAfter.payload)).not.toMatch(/Medical Notes|teacherId|staff.?only/i);
      const parentDocument=entity(parentAfter.payload,"Documents").records.find((row:any)=>row.id===photoRowId);
      expect(parentDocument).toBeTruthy();
      expect((await write(parent.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"parent",action:"acknowledgement:create",record:parentDocument,values:{message:"Photo received"}})).status()).toBe(200);
      expect((await write(parent.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"parent",action:"message:create",record:entity(parentAfter.payload,"Children").records.find((row:any)=>row.id===child.id),values:{message:"Thank you"}})).status()).toBe(200);

      const managerActivities=await managerRows(manager,baseURL!,managerTablesData.find((table:any)=>table.name==="Activities").id);
      expect(managerActivities.some((row:any)=>row.id===activityId)).toBe(true);
      const foreign=await portal(teacherB,baseURL!,"teacher");
      expect((await write(teacherB.request,baseURL!,{workspaceId:foreign.workspaceId,portalType:"teacher",action:"sleep:start",record:child})).status()).toBe(404);
      expect((await parentB.request.get(`${baseURL}/uploads/${photo.id}/`)).status()).toBe(404);
      expect(entity((await portal(parentB,baseURL!,"parent")).payload,"Activities").records.some((row:any)=>row.id===activityId)).toBe(false);
      expect((await parent.request.get(`${baseURL}/uploads/${photo.id}/`)).status()).toBe(200);
    } finally { await Promise.all([teacher.close(),teacherB.close(),parent.close(),parentB.close(),manager.close()]); }
  });

  test("doctor lab workflow and patient-safe projection",async({browser,baseURL})=>{
    const doctor=await login(browser,baseURL!,"doctor-a@smartmanage-demo.com");
    const doctorB=await login(browser,baseURL!,"doctor-b@smartmanage-demo.com");
    const patient=await login(browser,baseURL!,"patient-a@smartmanage-demo.com");
    const patientB=await login(browser,baseURL!,"patient-b@smartmanage-demo.com");
    const manager=await login(browser,baseURL!,"portal-manager@smartmanage-demo.com");
    try {
      const initial=await portal(doctor,baseURL!,"doctor");
      const patientRecord=entity(initial.payload,"Patients").records[0];
      expect(patientRecord).toBeTruthy();
      const labResponse=await write(doctor.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"doctor",action:"lab_request:create",subject:patientRecord,values:{"Test / Request Type":"Acceptance X-Ray",Priority:"High","Requested Date":new Date().toISOString(),Status:"Requested","Share With Patient":true,Notes:"Sensitive clinical note"}});
      expect(labResponse.status(),await labResponse.text()).toBe(200);
      const labId=(await labResponse.json()).recordId;
      const doctorAfter=await portal(doctor,baseURL!,"doctor");
      const lab=entity(doctorAfter.payload,"Lab Requests").records.find((row:any)=>row.id===labId);
      expect(lab).toBeTruthy();
      expect(JSON.stringify(lab)).not.toContain("Sensitive clinical note");
      expect((await write(doctor.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"doctor",action:"lab_request:update",record:lab,values:{Status:"In Progress",Priority:"Urgent","Share With Patient":true,Notes:"must be ignored"}})).status()).toBe(200);
      const patientViews=await Promise.all([portal(patient,baseURL!,"patient"),portal(patientB,baseURL!,"patient")]);
      const visibleTo=patientViews.filter((view)=>entity(view.payload,"Lab Requests").records.some((row:any)=>row.id===labId));
      expect(visibleTo).toHaveLength(1);
      expect(JSON.stringify(visibleTo[0].payload)).not.toMatch(/Sensitive clinical note|Medical Notes|Cost|Dentist/i);
      const tables=await managerTables(manager,baseURL!,initial.workspaceId);
      const labRows=await managerRows(manager,baseURL!,tables.find((table:any)=>table.name==="Lab Requests").id);
      expect(labRows.some((row:any)=>row.id===labId)).toBe(true);
      const foreign=await portal(doctorB,baseURL!,"doctor");
      expect((await write(doctorB.request,baseURL!,{workspaceId:foreign.workspaceId,portalType:"doctor",action:"lab_request:update",record:lab,values:{Status:"Completed"}})).status()).toBe(404);

      const treatment=entity(doctorAfter.payload,"Treatments").records[0];
      expect((await write(doctor.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"doctor",action:"clinical_note:create",record:treatment,values:{text:"Acceptance confidential note"}})).status()).toBe(200);
      expect((await write(doctor.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"doctor",action:"treatment:update",record:treatment,values:{Status:"In Progress",Procedure:"Review"}})).status()).toBe(200);
      expect((await write(doctor.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"doctor",action:"follow_up:create",subject:patientRecord,values:{Name:"Follow-up",Date:new Date().toISOString(),Status:"Scheduled"}})).status()).toBe(200);
    } finally { await Promise.all([doctor.close(),doctorB.close(),patient.close(),patientB.close(),manager.close()]); }
  });

  test("patient shared document permissions and protected metadata",async({browser,baseURL})=>{
    const patient=await login(browser,baseURL!,"patient-a@smartmanage-demo.com");
    const patientB=await login(browser,baseURL!,"patient-b@smartmanage-demo.com");
    const manager=await login(browser,baseURL!,"portal-manager@smartmanage-demo.com");
    try {
      const initial=await portal(patient,baseURL!,"patient");
      const document=entity(initial.payload,"Documents").records[0];
      expect(document).toBeTruthy();
      const tables=await managerTables(manager,baseURL!,initial.workspaceId);
      const documentsTable=tables.find((table:any)=>table.name==="Documents");
      const fileUpload=await upload(manager.request,baseURL!,{workspaceId:initial.workspaceId,tableId:documentsTable.id,rowId:document.id,name:"shared-care-plan.pdf",mimeType:"application/pdf",buffer:pdf});
      expect(fileUpload.status(),await fileUpload.text()).toBe(200);
      const file=await fileUpload.json();
      expect((await patient.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(200);
      expect((await patientB.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(404);
      expect((await write(patient.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"patient",action:"document:acknowledge",record:document,values:{message:"Document reviewed"}})).status()).toBe(200);
      expect((await write(patient.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"patient",action:"document:message",record:document,values:{message:"Please clarify this document"}})).status()).toBe(200);
      const foreign=await portal(patientB,baseURL!,"patient");
      expect((await write(patientB.request,baseURL!,{workspaceId:foreign.workspaceId,portalType:"patient",action:"document:acknowledge",record:document,values:{message:"attack",Visibility:"Shared",Status:"Shared"}})).status()).toBe(404);
      expect(JSON.stringify(initial.payload)).not.toMatch(/Internal Notes|Medical Notes|Cost|Dentist|staff.?only/i);
    } finally { await Promise.all([patient.close(),patientB.close(),manager.close()]); }
  });

  test("client real document workflow and cross-company upload rejection",async({browser,baseURL})=>{
    const client=await login(browser,baseURL!,"client-a@smartmanage-demo.com");
    const clientB=await login(browser,baseURL!,"client-b@smartmanage-demo.com");
    const manager=await login(browser,baseURL!,"portal-manager@smartmanage-demo.com");
    try {
      const initial=await portal(client,baseURL!,"client");
      const load=entity(initial.payload,"Loads").records[0];
      const valid=await upload(client.request,baseURL!,{workspaceId:initial.workspaceId,rowId:load.id,portalType:"client",portalAction:"document:create",writeToken:load.writeToken,name:"shipment-proof.pdf",mimeType:"application/pdf",buffer:pdf});
      expect(valid.status(),await valid.text()).toBe(200);
      const file=await valid.json();
      const documentWrite=await write(client.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"client",action:"document:create",subject:load,values:{"Document Type":"Proof of Delivery",File:file,Status:"Valid"}});
      expect(documentWrite.status()).toBe(200);
      const documentId=(await documentWrite.json()).recordId;
      const after=await portal(client,baseURL!,"client");
      expect(entity(after.payload,"Documents").records.some((row:any)=>row.id===documentId)).toBe(true);
      expect(JSON.stringify(after.payload)).not.toMatch(/Buy Rate|Sell Rate|Profit|Dispatcher|Carrier Paid/i);
      expect((await client.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(200);
      expect((await clientB.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(404);
      const tables=await managerTables(manager,baseURL!,initial.workspaceId);
      expect((await managerRows(manager,baseURL!,tables.find((table:any)=>table.name==="Documents").id)).some((row:any)=>row.id===documentId)).toBe(true);
      expect((await write(client.request,baseURL!,{workspaceId:initial.workspaceId,portalType:"client",action:"shipment:request",record:load,values:{requestType:"Delivery update",message:"Please confirm ETA"}})).status()).toBe(200);

      const foreign=await portal(clientB,baseURL!,"client");
      const foreignLoad=entity(foreign.payload,"Loads").records[0];
      const attacks=[
        {workspaceId:initial.workspaceId,rowId:foreignLoad.id,writeToken:load.writeToken},
        {workspaceId:initial.workspaceId,rowId:foreignLoad.id,writeToken:"invalid"},
      ];
      for(const attack of attacks) expect([403,404]).toContain((await upload(client.request,baseURL!,{workspaceId:attack.workspaceId,rowId:attack.rowId,portalType:"client",portalAction:"document:create",writeToken:attack.writeToken,name:"attack.pdf",mimeType:"application/pdf",buffer:pdf})).status());
      expect((await upload(client.request,baseURL!,{workspaceId:initial.workspaceId,rowId:load.id,portalType:"client",portalAction:"document:create",writeToken:"invalid",name:"expired.pdf",mimeType:"application/pdf",buffer:pdf})).status()).toBe(404);
    } finally { await Promise.all([client.close(),clientB.close(),manager.close()]); }
  });

  test("driver READY regression covers lifecycle, files, expense, fuel and incident",async({browser,baseURL})=>{
    const driver=await login(browser,baseURL!,"driver-a@smartmanage-demo.com");
    const driverB=await login(browser,baseURL!,"driver-b@smartmanage-demo.com");
    const manager=await login(browser,baseURL!,"portal-manager@smartmanage-demo.com");
    try {
      const membership=await driver.request.get(`${baseURL}/api/portal-context/?portalType=driver`);
      const workspaceId=(await membership.json()).active.workspaceId;
      const trips=await driver.request.get(`${baseURL}/api/logistics/driver/trips/?workspaceId=${workspaceId}`);
      const trip=(await trips.json()).trips[0];
      for(const status of ["Loaded","Delivered","Problem Reported"]) expect((await driver.request.patch(`${baseURL}/api/logistics/driver/trips/`,{data:{workspaceId,tripId:trip.id,status,confirmed:true}})).status()).toBe(200);
      const file={url:"https://example.com/acceptance.pdf",name:"acceptance.pdf",type:"application/pdf",size:100};
      for(const [category,extra] of [["trip",{}],["expense",{amount:20,expenseType:"Toll"}],["fuel",{liters:20,pricePerLiter:1.5,odometer:120000}] ] as const) expect((await driver.request.post(`${baseURL}/api/logistics/driver/documents/`,{data:{workspaceId,tripId:trip.id,category,file,...extra}})).status()).toBe(200);
      const foreignMembership=await driverB.request.get(`${baseURL}/api/portal-context/?portalType=driver`);
      const foreignWorkspace=(await foreignMembership.json()).active.workspaceId;
      expect((await driverB.request.patch(`${baseURL}/api/logistics/driver/trips/`,{data:{workspaceId:foreignWorkspace,tripId:trip.id,status:"Delivered",confirmed:true}})).status()).toBe(404);
      const tables=await managerTables(manager,baseURL!,workspaceId);
      for(const board of ["Trips","Expenses","Fuel"]) expect((await managerRows(manager,baseURL!,tables.find((table:any)=>table.name===board).id)).length).toBeGreaterThan(0);
    } finally { await Promise.all([driver.close(),driverB.close(),manager.close()]); }
  });
});
