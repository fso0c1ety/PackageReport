const test = require('node:test');
const assert = require('node:assert/strict');
const { getKanbanTaskTitle } = require('../src/app/board/kanbanTaskTitle.cjs');

test('renders string first-column values', () => assert.equal(getKanbanTaskTitle('MEDICA SHPK'), 'MEDICA SHPK'));
test('renders a single-item string array', () => assert.equal(getKanbanTaskTitle(['NEXUS HOSPITAL']), 'NEXUS HOSPITAL'));
test('renders multiple values', () => assert.equal(getKanbanTaskTitle(['A', 'B']), 'A, B'));
test('uses Untitled only for empty values', () => {
  for (const value of [[], null, undefined, '', '   ']) assert.equal(getKanbanTaskTitle(value), 'Untitled');
});
test('renders dropdown option objects', () => assert.equal(getKanbanTaskTitle([{ label: 'MEDICA SHPK' }]), 'MEDICA SHPK'));
