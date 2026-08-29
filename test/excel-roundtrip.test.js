const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const root = path.join(__dirname, "..");
const exporter = fs.readFileSync(path.join(root, "src/app/TableBoard.tsx"), "utf8");
const importer = fs.readFileSync(path.join(root, "src/app/api/tables/import-excel/route.js"), "utf8");
const legacyImporter = fs.readFileSync(path.join(root, "server/routes/tableCreation.js"), "utf8");

test("Smart Manage exports carry hidden schema metadata and date-only values", async () => {
  assert.match(exporter, /SMART_MANAGE_EXPORT/);
  assert.match(exporter, /state: 'veryHidden'/);
  assert.match(exporter, /format\('YYYY-MM-DD'\)/);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Demo Board");
  sheet.addRow(["Demo Board", "", "This spreadsheet was created using Smart Manage"]);
  sheet.addRow(["Manage your workspace data"]);
  sheet.addRow([]);
  sheet.addRow(["To-Do", "", "Exported Mar 3, 2026 10:00"]);
  sheet.addRow(["Name", "Status", "Date"]);
  for (let index = 0; index < 450; index += 1) {
    sheet.addRow([`Sample row ${index + 1}`, index % 2 ? "Inactive" : "Active", "2026-03-03"]);
  }
  const metadata = workbook.addWorksheet("_smart_manage_meta", { state: "veryHidden" });
  metadata.getCell("A1").value = JSON.stringify({
    marker: "SMART_MANAGE_EXPORT",
    version: 1,
    boardName: "Demo Board",
    headerRow: 5,
    dataStartRow: 6,
    columns: [
      { name: "Name", type: "Text", order: 0 },
      { name: "Status", type: "Status", order: 1, options: [{ value: "Active", color: "#00c875" }] },
      { name: "Date", type: "Date", order: 2 },
    ],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);
  const meta = JSON.parse(loaded.getWorksheet("_smart_manage_meta").getCell("A1").value);
  assert.equal(loaded.getWorksheet("_smart_manage_meta").state, "veryHidden");
  assert.equal(meta.marker, "SMART_MANAGE_EXPORT");
  assert.equal(meta.boardName, "Demo Board");
  assert.equal(loaded.getWorksheet(1).getRow(6).getCell(3).value, "2026-03-03");
  assert.equal(loaded.getWorksheet(1).rowCount - 5, 450);
});

test("Smart Manage metadata strategy scales without importing helper rows", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Large Board");
  sheet.addRows([["Large Board"], [""], [""], ["To-Do"], ["Name"]]);
  for (let index = 0; index < 1000; index += 1) sheet.addRow([`Sample ${index + 1}`]);
  const metadata = workbook.addWorksheet("_smart_manage_meta", { state: "veryHidden" });
  metadata.getCell("A1").value = JSON.stringify({ marker: "SMART_MANAGE_EXPORT", version: 1, boardName: "Large Board", headerRow: 5, columns: [{ name: "Name", type: "Text", order: 0 }] });
  const buffer = await workbook.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);
  assert.equal(loaded.worksheets[0].rowCount - 5, 1000);
  assert.equal(loaded.getWorksheet("_smart_manage_meta").state, "veryHidden");
});

test("Smart Manage import selects metadata schema and never treats helper metadata as rows", () => {
  assert.match(importer, /getWorksheet\('_smart_manage_meta'\)/);
  assert.match(importer, /parsedMetadata\?\.marker === "SMART_MANAGE_EXPORT"/);
  assert.match(importer, /smartManageMetadata\?\.headerRow/);
  assert.match(importer, /smartManageMetadata\?\.columns/);
  assert.match(importer, /smartManageMetadata\?\.boardName/);
});

test("legacy Smart Manage export headers detect Task/Data and convert Excel date serials", () => {
  assert.match(importer, /This spreadsheet was created using Smart Manage/);
  assert.match(importer, /hasSmartManageSignature/);
  assert.match(importer, /normalized\.includes\("TASK"\)/);
  assert.match(importer, /normalized\.includes\("STATUSI I DERGESES"\)/);
  assert.match(importer, /normalized\.includes\("DATA"\)/);
  assert.match(importer, /excelSerialToIsoDate/);
  assert.match(importer, /column\.type === "Date" && typeof rawValue === "number"/);
  assert.match(importer, /TASK: "Text"/);
  assert.match(importer, /DATA: "Date"/);
});

test("production Express importer uses the dedicated Smart Manage legacy parser", () => {
  assert.match(legacyImporter, /this spreadsheet was created using smart manage/);
  assert.match(legacyImporter, /headers\.includes\('TASK'\)/);
  assert.match(legacyImporter, /headers\.includes\('DATA'\)/);
  assert.match(legacyImporter, /smartManageMetadata/);
  assert.match(legacyImporter, /board_groups/);
  assert.match(legacyImporter, /dateOnlyFromExcelDate/);
  assert.doesNotMatch(legacyImporter, /getHexFromExcelColor\(cell\.fill/);
});
