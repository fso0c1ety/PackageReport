const counters = new Map();
const gauges = new Map();
const timings = new Map();

function increment(name, labels = {}, value = 1) { const key = `${name}:${JSON.stringify(labels)}`; counters.set(key, (counters.get(key) || 0) + value); }
function gauge(name, value, labels = {}) { gauges.set(`${name}:${JSON.stringify(labels)}`, Number(value) || 0); }
function timing(name, durationMs, labels = {}) {
  const key = `${name}:${JSON.stringify(labels)}`; const current = timings.get(key) || { count: 0, totalMs: 0, maxMs: 0 };
  current.count += 1; current.totalMs += durationMs; current.maxMs = Math.max(current.maxMs, durationMs); timings.set(key, current);
}
function snapshot() { return { counters: Object.fromEntries(counters), gauges: Object.fromEntries(gauges), timings: Object.fromEntries(timings), collectedAt: new Date().toISOString() }; }

module.exports = { gauge, increment, snapshot, timing };
