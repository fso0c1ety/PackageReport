import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";

const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;
const pdf = Buffer.from("%PDF-1.4\n%%EOF\n");
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);

async function login(browser: Browser, baseURL: string, email: string) {
  const context = await browser.newContext({ baseURL });
  const response = await context.request.post(`${baseURL}/api/login/`, { data:{email,password}, headers:{Origin:baseURL} });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  await context.setExtraHTTPHeaders({Authorization:`Bearer ${body.token}`});
  return context;
}

async function portal(request: APIRequestContext, baseURL: string, portalType: string) {
  const membershipResponse = await request.get(`${baseURL}/api/portal-context/?portalType=${portalType}`);
  expect(membershipResponse.status()).toBe(200);
  const membership = (await membershipResponse.json()).active;
  const response = await request.get(`${baseURL}/api/professional-portal/?workspaceId=${membership.workspaceId}&portalType=${portalType}`);
  expect(response.status()).toBe(200);
  return { workspaceId:membership.workspaceId, payload:await response.json() };
}

async function portalUpload(request: APIRequestContext, baseURL: string, input: {workspaceId:string;rowId:string;portalType:string;portalAction:string;writeToken:string;name:string;mimeType:string;buffer:Buffer}) {
  return request.post(`${baseURL}/api/upload/`, { multipart:{
    workspaceId:input.workspaceId,rowId:input.rowId,portalType:input.portalType,portalAction:input.portalAction,writeToken:input.writeToken,
    file:{name:input.name,mimeType:input.mimeType,buffer:input.buffer},
  }});
}

test.describe("portal file authorization", () => {
  test.setTimeout(120_000);
  test.skip(!password,"SMART_MANAGE_PORTAL_TEST_PASSWORD is required");

  test("teacher photo is visible to its teacher and parent only", async ({browser,baseURL}) => {
    const teacherA=await login(browser,baseURL!,"teacher-a@smartmanage-demo.com");
    const teacherB=await login(browser,baseURL!,"teacher-b@smartmanage-demo.com");
    const parentA=await login(browser,baseURL!,"parent-a@smartmanage-demo.com");
    const parentB=await login(browser,baseURL!,"parent-b@smartmanage-demo.com");
    try {
      const data=await portal(teacherA.request,baseURL!,"teacher");
      const parentData=await portal(parentA.request,baseURL!,"parent");
      const parentChildren=parentData.payload.entities.find((entry:any)=>entry.entity==="Children").records;
      const parentChildIds=new Set(parentChildren.map((entry:any)=>entry.id));
      const child=data.payload.entities.find((entry:any)=>entry.entity==="Children").records.find((entry:any)=>parentChildIds.has(entry.id));
      const teacherChildIds=data.payload.entities.find((entry:any)=>entry.entity==="Children").records.map((entry:any)=>entry.id);
      expect(child,`Teacher A and Parent A must share the same seeded child; teacher=${teacherChildIds.join(",")} parent=${[...parentChildIds].join(",")}`).toBeTruthy();
      const upload=await portalUpload(teacherA.request,baseURL!,{workspaceId:data.workspaceId,rowId:child.id,portalType:"teacher",portalAction:"photo:create",writeToken:child.writeToken,name:"class-photo.png",mimeType:"image/png",buffer:png});
      expect(upload.status(),await upload.text()).toBe(200);
      const file=await upload.json();
      expect((await teacherA.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(200);
      expect((await parentA.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(200);
      expect((await teacherB.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(404);
      expect((await parentB.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(404);

      const foreign=await portal(teacherB.request,baseURL!,"teacher");
      const foreignChild=foreign.payload.entities.find((entry:any)=>entry.entity==="Children").records[0];
      const stolenCapability=await portalUpload(teacherB.request,baseURL!,{workspaceId:foreign.workspaceId,rowId:child.id,portalType:"teacher",portalAction:"photo:create",writeToken:child.writeToken,name:"attack.png",mimeType:"image/png",buffer:png});
      expect([403,404]).toContain(stolenCapability.status());
      const wrongEntity=await portalUpload(teacherA.request,baseURL!,{workspaceId:data.workspaceId,rowId:foreignChild.id,portalType:"teacher",portalAction:"photo:create",writeToken:"expired-or-invalid",name:"attack.png",mimeType:"image/png",buffer:png});
      expect([403,404]).toContain(wrongEntity.status());
    } finally { await Promise.all([teacherA.close(),teacherB.close(),parentA.close(),parentB.close()]); }
  });

  test("client document remains isolated and invalid uploads fail safely", async ({browser,baseURL}) => {
    const clientA=await login(browser,baseURL!,"client-a@smartmanage-demo.com");
    const clientB=await login(browser,baseURL!,"client-b@smartmanage-demo.com");
    try {
      const data=await portal(clientA.request,baseURL!,"client");
      const load=data.payload.entities.find((entry:any)=>entry.entity==="Loads").records[0];
      const input={workspaceId:data.workspaceId,rowId:load.id,portalType:"client",portalAction:"document:create",writeToken:load.writeToken};
      const upload=await portalUpload(clientA.request,baseURL!,{...input,name:"shipment.pdf",mimeType:"application/pdf",buffer:pdf});
      expect(upload.status(),await upload.text()).toBe(200);
      const file=await upload.json();
      expect((await clientA.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(200);
      expect((await clientB.request.get(`${baseURL}/uploads/${file.id}/`)).status()).toBe(404);
      expect((await portalUpload(clientA.request,baseURL!,{...input,name:"script.txt",mimeType:"text/plain",buffer:Buffer.from("bad")})).status()).toBe(400);
      expect((await portalUpload(clientA.request,baseURL!,{...input,name:"fake.png",mimeType:"application/pdf",buffer:pdf})).status()).toBeGreaterThanOrEqual(400);
      const oversized = await portalUpload(clientA.request,baseURL!,{
        ...input,
        name:"huge.pdf",
        mimeType:"application/pdf",
        buffer:Buffer.concat([pdf,Buffer.alloc(50 * 1024 * 1024 + 1)]),
      });
      expect(oversized.status()).toBeGreaterThanOrEqual(400);
    } finally { await Promise.all([clientA.close(),clientB.close()]); }
  });
});
