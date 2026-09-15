const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/app/api/tables/[tableId]/tasks/route.js'), 'utf8');
const getSource = source.slice(source.indexOf('export async function GET('), source.indexOf('export async function POST(')).replace('export async function', 'async function');

async function readPage(scope, rows, offset = 0) {
  const queries = [];
  const context = {
    getAuthenticatedUser: () => ({ id: 'reader' }),
    requireBoardPermission: async () => ({ id: 'board' }),
    recordAccessQueryContext: () => ({ access: { scope }, columns: [], userId: 'reader' }),
    pool: { query: async (sql, params) => { queries.push({ sql, params }); return { rows: sql.startsWith('SELECT COUNT') ? [{ total: 12 }] : rows }; } },
    NextResponse: { json: (body, options) => ({ body, options }) },
    toArray: () => [], console,
  };
  vm.createContext(context);
  vm.runInContext(getSource + '\nthis.runGet = GET;', context);
  const result = await context.runGet({ nextUrl: new URL(`https://example.test/?limit=100&offset=${offset}`) }, { params: { tableId: 'board' } });
  return { queries, body: result.body };
}

test('all-permitted rows retain table scoping and exact pagination without per-row permission calls', async () => {
  const { queries, body } = await readPage('all_permitted', [{ id: 'row', values: {}, __visible_total: 12 }]);
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /WHERE table_id=\$1 ORDER BY/);
  assert.doesNotMatch(queries[0].sql, /smart_manage_row_visible/);
  assert.match(queries[0].sql, /LIMIT \$2 OFFSET \$3/);
  assert.deepEqual(Array.from(queries[0].params), ['board', 100, 0]);
  assert.equal(body.total, 12);
  assert.equal(body.hasMore, true);
  assert.equal('__visible_total' in body.rows[0], false);
});

test('restricted rows retain the existing SQL authorization predicate and parameters', async () => {
  for (const scope of ['assigned_to_me', 'my_company', 'selected_records', 'custom']) {
    const { queries } = await readPage(scope, [{ id: 'row', values: {}, __visible_total: 1 }]);
    assert.match(queries[0].sql, /smart_manage_row_visible/);
    assert.match(queries[0].sql, /LIMIT \$8 OFFSET \$9/);
    assert.equal(JSON.parse(queries[0].params[3]).scope, scope);
  }
});

test('empty and out-of-range pages preserve the exact total contract', async () => {
  const empty = await readPage('all_permitted', []);
  assert.equal(empty.body.total, 0);
  assert.equal(empty.queries.length, 1);
  const beyond = await readPage('all_permitted', [], 100);
  assert.equal(beyond.body.total, 12);
  assert.equal(beyond.body.hasMore, false);
  assert.equal(beyond.queries.length, 2);
});
