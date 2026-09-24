const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const tableBoard = fs.readFileSync("src/app/TableBoard.tsx", "utf8");
const peopleSelector = fs.readFileSync("src/app/PeopleSelector.tsx", "utf8");

test("board switches do not repeat the unrelated profile request", () => {
  assert.match(tableBoard, /profileSyncRef\.current/);
  assert.match(tableBoard, /if \(!profileSyncRef\.current\)/);
  assert.match(tableBoard, /getApiUrl\("\/users\/profile"\)/);
});

test("driver user selection tolerates incomplete profile records", () => {
  assert.match(tableBoard, /Array\.isArray\(newValue\) && newValue\[0\]/);
  assert.match(peopleSelector, /String\(person\.name \|\| person\.email \|\| ''\)/);
  assert.match(peopleSelector, /String\(person\.email \|\| ''\)/);
});
