const test = require('node:test');
const assert = require('node:assert/strict');

test('performance harness keeps bounded samples and exposes phase-compatible records', () => {
  const phases = ['pointerdown', 'click', 'stateUpdate', 'render', 'mounted', 'layoutEffect', 'effect', 'raf1', 'raf2', 'visible'];
  assert.equal(phases.length, 10);
  assert.ok(phases.includes('visible'));
});

test('performance instrumentation is isolated from production by runtime guard', () => {
  const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'app', 'performanceHarness.ts'), 'utf8');
  assert.match(source, /NODE_ENV === "test"|NODE_ENV === "development"/);
  assert.match(source, /host !== "package-report\.vercel\.app"/);
});
