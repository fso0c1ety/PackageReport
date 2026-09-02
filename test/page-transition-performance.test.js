const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'PageTransition.tsx'), 'utf8');

test('route transitions do not impose a long blocking delay', () => {
  assert.match(source, /setTimeout\(\(\) => setIsAnimating\(false\), 180\)/);
  assert.match(source, /transition=\{\{ duration: 0\.15 \}\}/);
  assert.doesNotMatch(source, /delay: 0\.8/);
  assert.doesNotMatch(source, /setIsAnimating\(false\), 1200/);
});
