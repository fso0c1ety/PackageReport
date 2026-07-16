import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChartSeries, sanitizeFormSubmission } from '../server/services/professionalViewsEngine.js';

test('chart series supports count, sum and average aggregations', () => {
  const rows = [{ values: { status: 'Open', money: 10 } }, { values: { status: 'Open', money: 30 } }, { values: { status: 'Done', money: 5 } }];
  assert.deepEqual(buildChartSeries(rows, { groupColumnId: 'status' }).map(({ label, value }) => ({ label, value })), [{ label: 'Open', value: 2 }, { label: 'Done', value: 1 }]);
  assert.equal(buildChartSeries(rows, { groupColumnId: 'status', measureColumnId: 'money', aggregation: 'sum' })[0].value, 40);
  assert.equal(buildChartSeries(rows, { groupColumnId: 'status', measureColumnId: 'money', aggregation: 'average' })[0].value, 20);
});

test('form submission enforces required and email fields and omits computed fields', () => {
  const columns = [{ id: 'name', name: 'Name', type: 'Text', settings: { required: true } }, { id: 'email', name: 'Email', type: 'Email' }, { id: 'profit', name: 'Profit', type: 'Formula' }];
  const invalid = sanitizeFormSubmission(columns, { name: '', email: 'bad', profit: 99 });
  assert.equal(invalid.valid, false);
  assert.deepEqual(Object.keys(invalid.errors).sort(), ['email', 'name']);
  const valid = sanitizeFormSubmission(columns, { name: 'AGS', email: 'ags@example.com', profit: 99 });
  assert.equal(valid.valid, true);
  assert.equal('profit' in valid.values, false);
});
