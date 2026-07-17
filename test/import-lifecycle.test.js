import test from "node:test";
import assert from "node:assert/strict";
import { analyzeImportRows, applyColumnMapping, normalizeImportHeaders, parseTemplateJson } from "../src/app/api/_lib/importLifecycle.js";

test("import headers are non-empty and duplicate-safe", () => {
  assert.deepEqual(normalizeImportHeaders(["Name", "", "name"]), ["Name", "Column 2", "name (2)"]);
});

test("column mapping can rename and skip imported columns", () => {
  assert.deepEqual(applyColumnMapping(["A", "B"], [[1, 2]], { A: "Client", B: "" }), { headers: ["Client"], rows: [[1]] });
});

test("import analysis removes blank and duplicate rows and returns a report", () => {
  const report = analyzeImportRows(["Name", "Email"], [["AGS", "a@b.com"], ["ags", "A@B.COM"], ["", ""]]);
  assert.equal(report.accepted.length, 1);
  assert.equal(report.duplicates.length, 1);
  assert.equal(report.errors.length, 0);
});

test("template JSON is converted into tabular data", () => {
  const parsed = parseTemplateJson({ name: "CRM", columns: [{ name: "Company" }], rows: [{ values: { Company: "AGS" } }] });
  assert.deepEqual(parsed, { name: "CRM", headers: ["Company"], rows: [["AGS"]] });
});
