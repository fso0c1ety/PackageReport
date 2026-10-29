const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('egress audit invariants preserve bounded Kanban pagination', () => {
  const route = read('src/app/api/tables/[tableId]/tasks/route.js');
  assert.match(route, /Math\.min\(requestedLimit, 500\)/);
  assert.match(route, /statusColumnId/);
});

test('egress audit inventory records Realtime and fallback candidates', () => {
  const board = read('src/app/TableBoard.tsx');
  const driver = read('src/app/(dashboard)/driver-trips/page.tsx');
  assert.match(board, /supabase\.channel/);
  assert.match(board, /setInterval/);
  assert.match(driver, /setInterval/);
});

test('audit artifacts do not contain credentials or payload capture instructions', () => {
  for (const file of [
    'FULL_APPLICATION_NETWORK_INVENTORY.md',
    'SUPABASE_EGRESS_ROOT_CAUSE.md',
    'TENANT_EGRESS_MEASUREMENT_PLAN.md',
    'EGRESS_OPTIMIZATION_PLAN.md',
  ]) {
    const content = read(file);
    assert.doesNotMatch(content, /(?:password|secret|token)\s*[:=]\s*[^`\s]+/i);
  }
});
