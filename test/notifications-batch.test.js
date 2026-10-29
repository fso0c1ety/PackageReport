const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://127.0.0.1:1/smartmanage-test';
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

test('legacy notification helper skips deleted recipients before insert', async () => {
  const helperPath = require.resolve('../server/notificationHelper');
  const originalDb = require('../server/db');
  const originalQuery = originalDb.query;
  const inserted = [];
  originalDb.query = async (sql, params) => {
    if (sql.includes('FROM workspaces')) return { rows: [{ owner_id: 'deleted-owner' }] };
    if (sql.includes('SELECT id FROM users')) return { rows: [{ id: 'valid-user' }] };
    if (sql.includes('SELECT fcm_token')) return { rows: [{ id: 'valid-user', fcm_token: null, fcm_tokens: [] }] };
    if (sql.includes('INSERT INTO notifications')) inserted.push(params[1]);
    return { rows: [] };
  };
  try {
    delete require.cache[helperPath];
    const { sendNotification } = require('../server/notificationHelper');
    await sendNotification('title', 'body', 'test', {}, {
      id: 'table-1', workspace_id: 'workspace-1', shared_users: [{ userId: 'valid-user' }], name: 'Board',
    });
    assert.deepEqual(inserted, ['valid-user']);
  } finally {
    originalDb.query = originalQuery;
    delete require.cache[helperPath];
  }
});

test('legacy direct notification skips a deleted recipient', async () => {
  const helperPath = require.resolve('../server/notificationHelper');
  const originalDb = require('../server/db');
  const originalQuery = originalDb.query;
  let inserts = 0;
  originalDb.query = async (sql) => {
    if (sql.includes('SELECT id, fcm_token')) return { rows: [] };
    if (sql.includes('INSERT INTO notifications')) inserts += 1;
    return { rows: [] };
  };
  try {
    delete require.cache[helperPath];
    const { sendDirectNotification } = require('../server/notificationHelper');
    await sendDirectNotification('deleted-user', 'title', 'body', 'test', {});
    assert.equal(inserts, 0);
  } finally {
    originalDb.query = originalQuery;
    delete require.cache[helperPath];
  }
});
