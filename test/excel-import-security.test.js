import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Excel import uses the maintained ExcelJS parser instead of vulnerable SheetJS", async () => {
  const [packageJson, routeSource] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../src/app/api/tables/import-excel/route.js", import.meta.url), "utf8"),
  ]);

  assert.equal(packageJson.dependencies?.xlsx, undefined);
  assert.match(routeSource, /import ExcelJS from ["']exceljs["']/);
  assert.match(routeSource, /await workbook\.xlsx\.load\(buffer\)/);
  assert.doesNotMatch(routeSource, /from ["']xlsx["']/);
});
