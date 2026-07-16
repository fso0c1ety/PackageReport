const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanupRelations, relatedRowIds, removeRelation, upsertRelation } = require("../server/services/relationEngine");

const link = { sourceRowId: "company-1", sourceColumnId: "projects", targetTableId: "projects", targetRowId: "project-1" };

test("relations are deduplicated and can be bidirectional", () => {
  const relations = upsertRelation([link], link, { bidirectional: true, reverseColumnId: "company", sourceTableId: "companies" });
  assert.equal(relations.length, 2);
  assert.deepEqual(relatedRowIds(relations, "company-1", "projects"), ["project-1"]);
  assert.deepEqual(relatedRowIds(relations, "project-1", "company"), ["company-1"]);
});

test("relations enforce permission checks and remove both directions", () => {
  assert.throws(() => upsertRelation([], link, { canLink: () => false }), /permission denied/);
  const relations = upsertRelation([], link, { bidirectional: true, reverseColumnId: "company", sourceTableId: "companies" });
  assert.deepEqual(removeRelation(relations, link, { bidirectional: true, reverseColumnId: "company" }), []);
});

test("relations referencing archived or deleted rows are cleaned", () => {
  assert.deepEqual(cleanupRelations([link], new Set(["company-1"])), []);
  assert.equal(cleanupRelations([link], new Set(["company-1", "project-1"])).length, 1);
});
