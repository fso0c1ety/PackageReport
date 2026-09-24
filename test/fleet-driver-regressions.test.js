const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { describe, it } = require('node:test');

const tableBoard = fs.readFileSync(path.join(__dirname, '..', 'src/app/TableBoard.tsx'), 'utf8');
const peopleSelector = fs.readFileSync(path.join(__dirname, '..', 'src/app/PeopleSelector.tsx'), 'utf8');
const tasksRoute = fs.readFileSync(path.join(__dirname, '..', 'src/app/api/tables/[tableId]/tasks/route.js'), 'utf8');
const logistics = fs.readFileSync(path.join(__dirname, '..', 'src/app/api/_lib/logistics.js'), 'utf8');
const driverTripsRoute = fs.readFileSync(path.join(__dirname, '..', 'src/app/api/logistics/driver/trips/route.js'), 'utf8');
const driverDocumentsRoute = fs.readFileSync(path.join(__dirname, '..', 'src/app/api/logistics/driver/documents/route.js'), 'utf8');

describe('fleet driver assignment and relation options', () => {
  it('normalizes selected workspace members before persisting People cells', () => {
    assert.match(peopleSelector, /export function normalizePerson/);
    assert.match(peopleSelector, /const normalizedPerson = normalizePerson\(person\)/);
    assert.match(tableBoard, /newValue = Array\.isArray\(newValue\) \? newValue\.filter\(Boolean\)\.map/);
    assert.match(tableBoard, /name: String\(p\?\.name \?\? p\?\.email/);
  });

  it('uses the Drivers User field and renders object-valued people by name', () => {
    assert.match(tableBoard, /String\(column\.name \|\| ''\).*\.toLowerCase\(\) === 'user'/);
    assert.match(tableBoard, /function relationDisplayLabel/);
    assert.match(tableBoard, /relationDisplayLabel\(rawLabel\)/);
    assert.doesNotMatch(tableBoard, /label: String\(rawLabel \|\| "Untitled row"\)/);
  });
  it('never renders object-shaped person names as React children', () => {
    assert.match(tableBoard, /function normalizeRenderedPerson/);
    assert.match(tableBoard, /typeof rawName === 'string'/);
    assert.match(tableBoard, /value\.map\(normalizeRenderedPerson\)/);
    assert.match(tableBoard, /function safeEditorValue/);
    assert.match(tableBoard, /value=\{safeEditorValue\(reviewTask\.values\[col\.id\]\)\}/);
    assert.match(tableBoard, /safeEditorValue\(reviewTask\.values\[columns\[0\]\.id\]\)/);
    assert.match(peopleSelector, /initialPeople\.map\(normalizePerson\)/);
  });
  it('normalizes People values once at the tasks API boundary', () => {
    assert.match(tasksRoute, /function normalizePeopleValues/);
    assert.match(tasksRoute, /column\?\.type !== "People"/);
    assert.match(tasksRoute, /values: normalizePeopleValues\(table\.columns, row\.values\)/);
    assert.match(tasksRoute, /const values = normalizePeopleValues\(tableForAssignment\?\.columns/);
    assert.match(tasksRoute, /const newValues = normalizePeopleValues\(table\.columns, addressResult\.values\)/);
    assert.match(tasksRoute, /name: String\(person\.name \|\| person\.email/);
  });
  it('uses one driver identity resolver across trips, documents and expenses', () => {
    assert.match(logistics, /function driverUserIdFromValues/);
    assert.match(logistics, /_assignedDriverUserId/);
    assert.match(logistics, /assigned driver/);
    assert.match(driverTripsRoute, /driverUserIdFromValues\(row\.values/);
    assert.match(driverTripsRoute, /driverUserIdFromValues\(candidate\.values/);
    assert.match(driverDocumentsRoute, /driverUserIdFromValues\(row\.values/);
    assert.match(driverDocumentsRoute, /driverUserIdFromValues\(tripCandidate\.values/);
    assert.match(driverDocumentsRoute, /_assignedDriverUserId/);
  });
});
