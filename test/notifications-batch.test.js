const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createNotificationsRouter } = require('../server/routes/notifications');

test('50 notification enrichments use one batch lookup and retain recipient filtering', async () => {
  const tableId = '11111111-1111-4111-8111-111111111111';
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM notifications')) return { rows: Array.from({ length: 50 }, (_, id) => ({ id, data: { tableId } })) };
    return { rows: [{ id: tableId, workspace_id: 'synthetic-workspace' }] };
  } };
  const app = express();
  app.use((req, res, next) => { req.user = { id: 'synthetic-recipient' }; next(); });
  app.use(createNotificationsRouter({ db, logger: { warn() {}, error() {} } }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/notifications`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.length, 50);
    assert.ok(body.every(item => item.data.workspaceId === 'synthetic-workspace'));
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].params, ['synthetic-recipient']);
    assert.deepEqual(calls[1].params, [[tableId]]);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
