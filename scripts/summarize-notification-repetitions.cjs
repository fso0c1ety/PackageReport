const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const dir = process.argv[2] || '/tmp/notification-volume-results';
const comparisons = [];
for (let repetition = 1; repetition <= 3; repetition++) {
  const read = mode => JSON.parse(fs.readFileSync(path.join(dir, `${mode}-${repetition}.json`), 'utf8')).results;
  const base = read('BASE'), head = read('HEAD');
  assert.equal(base.length, 2); assert.equal(head.length, 2);
  for (let i = 0; i < 2; i++) {
    const b = base[i], h = head[i];
    for (const row of [b,h]) {
      assert.equal(row.tenant, i+1); assert.equal(row.repetition,repetition);
      assert.equal(row.isolation,'PASS'); assert(row.requests >= 100);
      assert.equal(row.samplesMs.length,row.requests);
      assert(row.samplesMs.every(ms=>Number.isFinite(ms)&&ms>=0));
      assert(row.dbCalls>0 && row.dbRows>0);
    }
    assert.equal(b.requests,h.requests); assert.equal(b.responseBytes,h.responseBytes);
    comparisons.push({repetition,tenant:i+1,baseP95:b.p95Ms,headP95:h.p95Ms,p95ChangePercent:(h.p95Ms/b.p95Ms-1)*100,baseCalls:b.dbCalls,headCalls:h.dbCalls,baseRows:b.dbRows,headRows:h.dbRows,bytes:b.responseBytes});
  }
}
fs.writeFileSync(path.join(dir,'COMPARISON.json'),JSON.stringify({comparisons,conclusion:'INCONCLUSIVE: fixed BASE-then-HEAD order, no causal GC/pool or concurrent-load attribution; independent repetitions are descriptive, not a statistical guarantee',billedEgress:'UNKNOWN'},null,2));
console.log(JSON.stringify(comparisons));
