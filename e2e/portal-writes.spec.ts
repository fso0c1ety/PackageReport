import { expect, test, type APIRequestContext, type Browser, type BrowserContext } from "@playwright/test";

const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;
const cases = [
  { portalType:"teacher", a:"teacher-a@smartmanage-demo.com", b:"teacher-b@smartmanage-demo.com", action:"observation:create", entity:"Children", values:{text:"Acceptance observation",shareable:"true"} },
  { portalType:"parent", a:"parent-a@smartmanage-demo.com", b:"parent-b@smartmanage-demo.com", action:"message:create", entity:"Children", values:{message:"Acceptance parent message"} },
  { portalType:"doctor", a:"doctor-a@smartmanage-demo.com", b:"doctor-b@smartmanage-demo.com", action:"clinical_note:create", entity:"Treatments", values:{text:"Acceptance clinical note"} },
  { portalType:"patient", a:"patient-a@smartmanage-demo.com", b:"patient-b@smartmanage-demo.com", action:"message:create", entity:"Appointments", values:{message:"Acceptance patient message"} },
  { portalType:"client", a:"client-a@smartmanage-demo.com", b:"client-b@smartmanage-demo.com", action:"message:create", entity:"Loads", values:{message:"Acceptance client message"} },
] as const;

async function login(browser: Browser, email: string, baseURL: string) {
  const context = await browser.newContext({baseURL});
  const response = await context.request.post(`${baseURL}/api/login/`, {
    data: { email, password },
    headers: { Origin: baseURL },
  });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  const token = body.token;
  expect(token).toBeTruthy();
  await context.setExtraHTTPHeaders({Authorization:`Bearer ${token}`});
  return context;
}

async function snapshot(request: APIRequestContext, baseURL: string, portalType: string) {
  const contextResponse = await request.get(`${baseURL}/api/portal-context/?portalType=${portalType}`);
  expect(contextResponse.status()).toBe(200);
  const portal = (await contextResponse.json()).active;
  const response = await request.get(`${baseURL}/api/professional-portal/?workspaceId=${encodeURIComponent(portal.workspaceId)}&portalType=${portalType}`);
  expect(response.status()).toBe(200);
  return {workspaceId:portal.workspaceId,payload:await response.json()};
}

test.describe("professional portal write isolation", () => {
  test.setTimeout(90_000);
  test.skip(!password,"SMART_MANAGE_PORTAL_TEST_PASSWORD is required");

  test("driver status, document and expense writes sync while driver B remains forbidden", async ({browser,baseURL}) => {
    const a = await login(browser,"driver-a@smartmanage-demo.com",baseURL!);
    const b = await login(browser,"driver-b@smartmanage-demo.com",baseURL!);
    const manager = await login(browser,"portal-manager@smartmanage-demo.com",baseURL!);
    try {
      const portalResponse = await a.request.get(`${baseURL}/api/portal-context/?portalType=driver`);
      expect(portalResponse.status()).toBe(200);
      const workspaceId = (await portalResponse.json()).active.workspaceId;
      const tripsResponse = await a.request.get(`${baseURL}/api/logistics/driver/trips/?workspaceId=${workspaceId}`);
      expect(tripsResponse.status()).toBe(200);
      const trip = (await tripsResponse.json()).trips[0];
      expect(trip?.id).toBeTruthy();
      const nextStatus = trip.status === "Accepted" ? "Going to Pickup" : "Accepted";
      const statusWrite = await a.request.patch(`${baseURL}/api/logistics/driver/trips/`,{data:{workspaceId,tripId:trip.id,status:nextStatus,confirmed:true}});
      expect(statusWrite.status()).toBe(200);
      const expenseWrite = await a.request.post(`${baseURL}/api/logistics/driver/documents/`,{data:{workspaceId,tripId:trip.id,category:"expense",amount:25,expenseType:"Toll",description:"Acceptance expense",file:{url:"https://example.com/acceptance-receipt.pdf",name:"acceptance-receipt.pdf",type:"application/pdf",size:100}}});
      expect(expenseWrite.status()).toBe(200);
      const expense = await expenseWrite.json();

      const foreignPortal = await b.request.get(`${baseURL}/api/portal-context/?portalType=driver`);
      const foreignWorkspace = (await foreignPortal.json()).active.workspaceId;
      const attack = await b.request.patch(`${baseURL}/api/logistics/driver/trips/`,{data:{workspaceId:foreignWorkspace,tripId:trip.id,status:"Delivered",confirmed:true}});
      expect(attack.status()).toBe(404);

      const tablesResponse = await manager.request.get(`${baseURL}/api/workspaces/${workspaceId}/tables`);
      expect(tablesResponse.status()).toBe(200);
      const tables = await tablesResponse.json();
      const tripsTable = tables.find((item:any) => String(item.name).toLowerCase() === "trips");
      const expensesTable = tables.find((item:any) => ["expenses","costs"].includes(String(item.name).toLowerCase()));
      const managerTrips = await (await manager.request.get(`${baseURL}/api/tables/${tripsTable.id}/tasks`)).json();
      const managerExpenses = await (await manager.request.get(`${baseURL}/api/tables/${expensesTable.id}/tasks`)).json();
      expect(managerTrips.some((item:any) => item.id === trip.id)).toBe(true);
      expect(managerExpenses.some((item:any) => item.id === expense.rowId)).toBe(true);
    } finally { await a.close(); await b.close(); await manager.close(); }
  });

  for (const entry of cases) test(`${entry.portalType} writes sync while account B remains forbidden`, async ({browser,baseURL}) => {
    const a = await login(browser,entry.a,baseURL!);
    const b = await login(browser,entry.b,baseURL!);
    try {
      const before = await snapshot(a.request,baseURL!,entry.portalType);
      const entity = before.payload.entities.find((item:any) => item.entity === entry.entity);
      const record = entity?.records?.[0];
      expect(record?.id).toBeTruthy();
      const action = before.payload.config.writeActions.find((item:any) => item.id === entry.action);
      expect(action?.fields).toBeTruthy();

      const write = await a.request.post(`${baseURL}/api/professional-portal/`,{data:{workspaceId:before.workspaceId,portalType:entry.portalType,action:entry.action,recordId:record.id,writeToken:record.writeToken,values:entry.values,unexpectedAdminField:"must be ignored"}});
      expect(write.status(), await write.text()).toBe(200);
      const after = await snapshot(a.request,baseURL!,entry.portalType);
      const updated = after.payload.entities.find((item:any) => item.entity === entry.entity)?.records?.find((item:any) => item.id === record.id);
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(record.updatedAt).getTime());

      const manager = await login(browser,"portal-manager@smartmanage-demo.com",baseURL!);
      try {
        const tablesResponse = await manager.request.get(`${baseURL}/api/workspaces/${before.workspaceId}/tables`);
        expect(tablesResponse.status()).toBe(200);
        const table = (await tablesResponse.json()).find((item:any) => String(item.name).toLowerCase() === entry.entity.toLowerCase());
        expect(table?.id).toBeTruthy();
        const rowsResponse = await manager.request.get(`${baseURL}/api/tables/${table.id}/tasks`);
        expect(rowsResponse.status()).toBe(200);
        expect((await rowsResponse.json()).some((item:any) => item.id === record.id)).toBe(true);
      } finally { await manager.close(); }

      const foreign = await snapshot(b.request,baseURL!,entry.portalType);
      const attack = await b.request.post(`${baseURL}/api/professional-portal/`,{data:{workspaceId:foreign.workspaceId,portalType:entry.portalType,action:entry.action,recordId:record.id,writeToken:record.writeToken,values:entry.values}});
      expect(attack.status()).toBe(404);
    } finally { await a.close(); await b.close(); }
  });
});
