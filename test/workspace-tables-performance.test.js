const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/app/api/workspaces/[workspaceId]/tables/route.js', 'utf8');
const getSource = source.slice(source.indexOf('export async function GET('), source.indexOf('export async function POST('));

test('workspace tables GET uses one combined metadata/visibility query', () => {
  assert.match(getSource, /COALESCE\(json_agg\(to_jsonb\(t\)\)/);
  assert.match(getSource, /LEFT JOIN tables t ON t\.workspace_id=w\.id/);
  assert.doesNotMatch(getSource, /SELECT \* FROM workspaces WHERE id/);
  assert.match(getSource, /Server-Timing/);
});
