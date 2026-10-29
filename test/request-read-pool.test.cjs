const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requestReadPool } = require('../server/db/requestReadPool.cjs');
test('concurrent equal reads deduplicate, while users and requests stay independent', async () => {
  let calls = 0; const db = { query: async () => { calls++; return { rows: [] }; } };
  const a = requestReadPool(db); const b = requestReadPool(db);
  await Promise.all(Array.from({length:50},()=>a.query('SELECT membership WHERE user_id=$1',['a'])));
  assert.equal(calls,1);
  await a.query('SELECT membership WHERE user_id=$1',['b']);
  await b.query('SELECT membership WHERE user_id=$1',['a']);
  assert.equal(calls,3);
});
test('failures retry; writes invalidate previous reads', async () => {
  let calls=0; const db={query:async()=>{if(++calls===1)throw Error('unavailable');return {rows:[]};}};
  const read=requestReadPool(db);
  await assert.rejects(read.query('SELECT membership'),/unavailable/);
  await read.query('SELECT membership');await read.query('UPDATE membership');await read.query('SELECT membership');
  assert.equal(calls,4);
});
