import { expect, test, type Browser } from "@playwright/test";
import ExcelJS from "exceljs";

const password = process.env.SMART_MANAGE_DEMO_PASSWORD;

async function login(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL });
  const response = await context.request.post(`${baseURL}/api/login/`, {
    data: { email: "demo@smartmanage.com", password },
    headers: { Origin: baseURL },
  });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  await context.setExtraHTTPHeaders({ Authorization: `Bearer ${body.token}` });
  return { context, user: body.user };
}

test("imports a real XLSX workbook and preserves typed row values", async ({ browser, baseURL }) => {
  test.skip(!password, "SMART_MANAGE_DEMO_PASSWORD is required");

  const { context, user } = await login(browser, baseURL!);
  let tableId = "";
  try {
    const workspaceResponse = await context.request.get(`${baseURL}/api/workspaces/`);
    expect(workspaceResponse.status()).toBe(200);
    const workspaces = await workspaceResponse.json();
    const workspaceId = workspaces.find((workspace: { is_demo?: boolean; owner_id?: string }) => workspace.is_demo === true && String(workspace.owner_id) === String(user.id))?.id;
    expect(workspaceId).toBeTruthy();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Import Acceptance");
    worksheet.addRow(["Name", "Email", "Amount", "Status", "Date"]);
    worksheet.addRow(["Dërgesë Demo – Αθήνα", "shipment-a@example.test", 1250.5, "Ready", new Date("2026-08-12T00:00:00.000Z")]);
    worksheet.addRow(["Demo Shipment B", "", 800, "In Transit", new Date("2026-08-13T00:00:00.000Z")]);
    const xlsx = Buffer.from(await workbook.xlsx.writeBuffer());

    const imported = await context.request.post(`${baseURL}/api/tables/import-excel/`, {
      multipart: {
        workspaceId,
        tableName: `XLSX Acceptance ${Date.now()}`,
        file: { name: "acceptance.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: xlsx },
      },
    });
    const importBody = await imported.json();
    expect(imported.status(), JSON.stringify(importBody)).toBe(200);
    expect(importBody.rowCount).toBe(2);
    expect(importBody.columns.map((column: { name: string }) => column.name)).toEqual(["Name", "Email", "Amount", "Status", "Date"]);
    tableId = importBody.tableId;

    const rowsResponse = await context.request.get(`${baseURL}/api/tables/${tableId}/tasks`);
    expect(rowsResponse.status()).toBe(200);
    const rows = await rowsResponse.json();
    expect(rows).toHaveLength(2);
    const importedValues = rows.flatMap((row: { values?: Record<string, unknown> }) => Object.values(row.values || {}));
    expect(importedValues).toContain("Dërgesë Demo – Αθήνα");
    expect(importedValues).toContain(1250.5);
    expect(importedValues).toContain(800);
    expect(importedValues).toContain("");
    expect(importedValues).toContain("2026-08-12T00:00:00.000Z");

    const invalid = await context.request.post(`${baseURL}/api/tables/import-excel/`, {
      multipart: {
        workspaceId,
        file: { name: "invalid.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("not an xlsx") },
      },
    });
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toEqual({ error: "The uploaded file is not a valid Excel workbook" });
  } finally {
    if (tableId) {
      const cleanup = await context.request.delete(`${baseURL}/api/tables/${tableId}`);
      expect(cleanup.status()).toBe(200);
    }
    await context.close();
  }
});
