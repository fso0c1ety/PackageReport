const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { describe, it } = require('node:test');

const tableBoard = fs.readFileSync(path.join(__dirname, '..', 'src/app/TableBoard.tsx'), 'utf8');
const peopleSelector = fs.readFileSync(path.join(__dirname, '..', 'src/app/PeopleSelector.tsx'), 'utf8');

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
});
