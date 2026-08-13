import { expect, test, type Browser } from "@playwright/test";
import { jsPDF } from "jspdf";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import type { Page } from "@playwright/test";

const password = process.env.SMART_MANAGE_PORTAL_TEST_PASSWORD;

async function login(browser: Browser, baseURL: string, email: string) {
  const context = await browser.newContext({ baseURL, acceptDownloads: true });
  const response = await context.request.post(`${baseURL}/api/login/`, { data: { email, password }, headers: { Origin: baseURL } });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  await context.setExtraHTTPHeaders({ Authorization: `Bearer ${body.token}` });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }, { token: body.token, user: body.user });
  return context;
}

function brandedPdf(invoiceNumber: string) {
  const doc = new jsPDF({ compress: false });
  doc.setFontSize(18);
  doc.text(`Smart Manage ${invoiceNumber}`, 20, 25);
  doc.text("LOGO BRAND", 20, 40);
  doc.text("STAMP VERIFIED", 20, 55);
  doc.text("Acceptance service - EUR 125.00", 20, 70);
  return Buffer.from(doc.output("arraybuffer"));
}

async function downloadFromAuthenticatedPage(page: Page, url: string, filename: string) {
  const pending = page.waitForEvent("download");
  await page.evaluate(async ({ target, name }) => {
    const token = localStorage.getItem("token");
    const response = await fetch(target, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(`PDF request failed (${response.status})`);
    const blob = await response.blob();
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, { target: url, name: filename });
  return pending;
}

test("saved invoice PDF downloads from history and stays tenant isolated", async ({ browser, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Focused authenticated desktop invoice flow");
  test.skip(!password, "SMART_MANAGE_PORTAL_TEST_PASSWORD is required");
  test.setTimeout(120_000);

  const owner = await login(browser, baseURL!, "portal-manager@smartmanage-demo.com");
  const unauthorized = await login(browser, baseURL!, "driver-b@smartmanage-demo.com");
  let workspaceId = "";
  let localUploadPath = "";
  try {
    const workspaceResponse = await owner.request.post(`${baseURL}/api/workspaces/`, {
      data: { name: `Invoice PDF Acceptance ${Date.now()}`, templateKey: "blank", includeSampleData: false },
    });
    const workspace = await workspaceResponse.json();
    expect(workspaceResponse.status(), JSON.stringify(workspace)).toBe(200);
    workspaceId = workspace.id;
    const acceptanceDb = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
    try {
      await acceptanceDb.query("UPDATE workspaces SET is_demo=TRUE WHERE id=$1", [workspaceId]);
    } finally {
      await acceptanceDb.end();
    }

    const createResponse = await owner.request.post(`${baseURL}/api/invoices/`, { data: {
      workspaceId,
      clientName: "Acceptance Client",
      issueDate: "2026-08-13",
      dueDate: "2026-08-27",
      currency: "EUR",
      subtotal: 125,
      taxRate: 0,
      taxAmount: 0,
      total: 125,
      items: [{ description: "Acceptance service", quantity: 1, unitPrice: 125, amount: 125 }],
      branding: { companyName: "Smart Manage", logoUrl: "acceptance-logo", stampUrl: "acceptance-stamp" },
    } });
    const created = (await createResponse.json()).invoice;
    expect(createResponse.status()).toBe(201);

    const pdf = brandedPdf(created.invoice_number);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("LOGO BRAND");
    expect(pdf.toString("latin1")).toContain("STAMP VERIFIED");

    const uploadResponse = await owner.request.post(`${baseURL}/api/upload/`, { multipart: {
      workspaceId,
      file: { name: `${created.invoice_number}.pdf`, mimeType: "application/pdf", buffer: pdf },
    } });
    const uploaded = await uploadResponse.json();
    expect(uploadResponse.status(), JSON.stringify(uploaded)).toBe(200);
    localUploadPath = uploaded.path || "";

    const attachResponse = await owner.request.patch(`${baseURL}/api/invoices/${created.id}`, { data: { pdfFileId: uploaded.id } });
    expect(attachResponse.status(), await attachResponse.text()).toBe(200);

    const apiDownload = await owner.request.get(`${baseURL}/api/invoices/${created.id}/pdf`);
    expect(apiDownload.status()).toBe(200);
    expect(apiDownload.headers()["content-type"]).toContain("application/pdf");
    expect(apiDownload.headers()["content-disposition"]).toContain(`${created.invoice_number}.pdf`);
    expect((await apiDownload.body()).subarray(0, 5).toString()).toBe("%PDF-");

    expect([403, 404]).toContain((await unauthorized.request.get(`${baseURL}/api/invoices/${created.id}/pdf`)).status());

    const page = await owner.newPage();
    await page.goto("/");
    const pdfUrl = `${baseURL}/api/invoices/${created.id}/pdf`;
    const filename = `${created.invoice_number}.pdf`;
    const download = await downloadFromAuthenticatedPage(page, pdfUrl, filename);
    expect(download.suggestedFilename()).toBe(`${created.invoice_number}.pdf`);
    const savedPath = await download.path();
    expect(savedPath).toBeTruthy();
    expect((await fs.readFile(savedPath!)).subarray(0, 5).toString()).toBe("%PDF-");
    await page.reload();
    const refreshedDownload = await downloadFromAuthenticatedPage(page, pdfUrl, filename);
    expect(refreshedDownload.suggestedFilename()).toBe(filename);
  } finally {
    if (workspaceId) await owner.request.delete(`${baseURL}/api/workspaces/${workspaceId}`);
    if (localUploadPath && !path.isAbsolute(localUploadPath)) {
      await fs.unlink(path.join(process.cwd(), "uploads", path.basename(localUploadPath))).catch(() => undefined);
    }
    await owner.close();
    await unauthorized.close();
  }
});
