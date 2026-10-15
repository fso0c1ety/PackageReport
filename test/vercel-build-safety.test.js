const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

for (const environment of ['production', 'preview', 'development', undefined]) {
  test(`Vercel ${environment} only invokes application build without database access`, () => {
    const calls = [];
    vm.runInNewContext(fs.readFileSync('scripts/vercel-build.js', 'utf8'), {
      require(name) {
        assert.equal(name, 'node:child_process', 'no database module may be imported');
        return { spawnSync(command, args) { calls.push([command, ...args]); return { status: 0 }; } };
      },
      process: { platform: 'linux', env: { VERCEL_ENV: environment }, exit() { throw new Error('unexpected exit'); } },
    });
    assert.deepEqual(calls.map(call => Array.from(call)), [['npm', 'run', 'build']]);
  });
}
test('Vercel build propagates application build failures', () => {
  assert.throws(() => vm.runInNewContext(fs.readFileSync('scripts/vercel-build.js', 'utf8'), {
    require: () => ({ spawnSync: () => ({ status: 7 }) }),
    process: { platform: 'linux', env: {}, exit(code) { assert.equal(code, 7); throw new Error('build failed'); } },
  }), /build failed/);
});
