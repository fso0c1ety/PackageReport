const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

let presentation;
test.before(async () => { presentation = await import(pathToFileURL(join(process.cwd(), "src", "portal-engine", "presentation.mjs"))); });

test("relations resolve to human labels and never leak JSON or UUIDs", async () => {
  const uuid = "33a7509e-9f6f-42fb-9b2e-70920149d4a9";
  const value = await presentation.presentPortalValue({
    fieldName: "Child",
    column: { type:"Relation", settings:{ relationBoard:"Children" } },
    rawValue: [{ id:uuid, rowId:uuid, label:"Acceptance Child 1" }],
    resolveRelation: async () => "Klea Morina",
  });
  assert.deepEqual(value, { kind:"text", display:"Klea Morina", items:["Klea Morina"] });
  assert.doesNotMatch(JSON.stringify(value), /33a7509e|Acceptance Child|\[\{|rowId/);
});

test("multi-relations and tags become clean chips", async () => {
  const relation = await presentation.presentPortalValue({ fieldName:"Children", column:{type:"Relation"}, rawValue:[{label:"Klea Morina"},{label:"Noel Gashi"}], resolveRelation:async (entry) => entry.label });
  assert.deepEqual(relation.items, ["Klea Morina", "Noel Gashi"]);
  const tags = await presentation.presentPortalValue({ fieldName:"Allergies", column:{type:"Tags"}, rawValue:["Peanuts", "Lactose"] });
  assert.equal(tags.kind, "chips");
  assert.equal(tags.display, "Peanuts, Lactose");
});

test("dates use presentation descriptors so raw ISO text is never rendered", async () => {
  const date = await presentation.presentPortalValue({ fieldName:"Date / Time", column:{type:"Date"}, rawValue:"2026-09-13T09:00:00.000Z" });
  assert.equal(date.kind, "datetime");
  assert.equal(date.timestamp, 1789290000000);
  assert.equal(date.display, undefined);
});

test("field prefixes, objects, empty values, currency and files are normalized globally", async () => {
  assert.equal(presentation.stripRepeatedFieldLabel("Full Name", "Full Name — Klea Morina"), "Klea Morina");
  assert.equal(presentation.stripRepeatedFieldLabel("Load ID", "Load ID: LOAD-2414"), "LOAD-2414");
  const object = await presentation.presentPortalValue({ fieldName:"Company", column:{type:"Text"}, rawValue:{label:"Northstar Foods"} });
  assert.deepEqual(object, {kind:"text",display:"Northstar Foods"});
  const empty = await presentation.presentPortalValue({ fieldName:"Notes", column:{type:"Text"}, rawValue:null });
  assert.equal(empty.display, "—");
  const money = await presentation.presentPortalValue({ fieldName:"Amount", column:{type:"Money",settings:{currency:"EUR"}}, rawValue:1250.5 });
  assert.deepEqual(money, {kind:"currency",amount:1250.5,currency:"EUR"});
  const files = await presentation.presentPortalValue({ fieldName:"Documents", column:{type:"Files"}, rawValue:[{id:"33a7509e-9f6f-42fb-9b2e-70920149d4a9",name:"Treatment plan.pdf",url:"/api/files/1"}] });
  assert.equal(files.display, "Treatment plan.pdf");
  assert.doesNotMatch(JSON.stringify(files), /33a7509e/);
});

test("professional portal shell cannot fall back to serialized object rendering", () => {
  const shell = readFileSync(join(process.cwd(), "src", "app", "components", "portal", "PortalShell.tsx"), "utf8");
  assert.match(shell, /PortalFieldValue/);
  assert.doesNotMatch(shell, /typeof value === ["']object["']\s*\?\s*JSON\.stringify/);
  assert.match(shell, /dateTimeFormatter/);
  assert.match(shell, /repeat\(3,minmax\(0,1fr\)\)/);
});
