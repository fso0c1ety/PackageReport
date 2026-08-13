const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const read = (...parts) => readFileSync(join(process.cwd(), ...parts), "utf8");

test("invoice registry migration provides atomic workspace numbering and persistent history", () => {
  const sql = read("server", "db", "migrations", "030_invoice_registry.sql");
  assert.match(sql, /PRIMARY KEY \(workspace_id, invoice_year\)/);
  assert.match(sql, /UNIQUE \(workspace_id, invoice_number\)/);
  assert.match(sql, /pdf_file_id TEXT REFERENCES uploaded_files/);
  assert.match(sql, /CHECK \(status IN \('DRAFT','SENT','PAID','OVERDUE','CANCELLED'\)\)/);
});

test("invoice APIs enforce workspace and client isolation", () => {
  const lib = read("src", "app", "api", "_lib", "invoiceRegistry.js");
  const list = read("src", "app", "api", "invoices", "route.js");
  const detail = read("src", "app", "api", "invoices", "[invoiceId]", "route.js");
  const pdf = read("src", "app", "api", "invoices", "[invoiceId]", "pdf", "route.js");
  assert.match(lib, /requireWorkspacePermission/);
  assert.match(lib, /portal_type.*client/);
  assert.match(list, /i\.client_id/);
  assert.match(detail, /invoiceVisibleTo/);
  assert.match(pdf, /invoiceVisibleTo/);
  assert.match(pdf, /SUPABASE_SECRET_KEY/);
  assert.match(pdf, /\.storage\.from\(file\.storage_bucket\)\.download\(file\.object_path\)/);
  assert.match(pdf, /data\.subarray\(0,5\)\.toString\(\)!=="%PDF-"/);
});

test("invoice generation persists before attaching its secure PDF", () => {
  const board = read("src", "app", "TableBoard.tsx");
  assert.match(board, /persistGeneratedInvoice\(finalizedDraft, selectedRows\)/);
  assert.match(board, /handleDownloadInvoicePdf\(persistedDraft, false\)/);
  assert.match(board, /Invoice was not generated because it could not be saved/);
  assert.match(board, /pdfFileId: uploaded\.id/);
  assert.match(board, /downloadStoredInvoicePdf/);
  assert.match(board, /Invoice saved, but its PDF could not be stored/);
  assert.match(board, /Invoice PDF downloaded; secure history copy is not available yet/);
  assert.match(board, /else if \(storageError\)/);
});

test("invoice history downloads the stored PDF through an authenticated request", () => {
  const history = read("src", "app", "(dashboard)", "invoices", "page.tsx");
  const download = read("src", "app", "invoicePdfDownload.ts");
  assert.match(history, /downloadStoredInvoicePdf/);
  assert.doesNotMatch(history, /component="a" href=\{getApiUrl\(`\/invoices/);
  assert.match(download, /authenticatedFetch/);
  assert.match(download, /signature !== "%PDF-"/);
  assert.match(download, /anchor\.download = invoicePdfFilename/);
});

test("production deploy includes the invoice registry migration", () => {
  assert.match(read("scripts", "vercel-build.js"), /030_invoice_registry\.sql/);
});
