'use strict';

const REQUIRED = Object.freeze({
  test: 'suite-test',
  'portal-acceptance': 'suite-portal-acceptance',
  'kanban-postgres-e2e': 'suite-kanban-postgres-e2e',
  'clean-install': 'suite-clean-install',
  'local-safety': 'suite-local-safety',
  benchmark: 'suite-benchmark'
});

function isDocumentationOnly(files) {
  if (!Array.isArray(files) || files.length === 0) throw new Error('BLOCKED: changed file list unavailable');
  return files.every(file => typeof file === 'string' &&
    (/^(README|CONTRIBUTING|CHANGELOG)\.md$/.test(file) || /^docs\/[A-Za-z0-9_./-]+\.md$/.test(file)));
}

function evaluateGate(gate, files, checks) {
  if (!Object.hasOwn(REQUIRED, gate)) throw new Error('BLOCKED: unknown gate');
  const docsOnly = isDocumentationOnly(files);
  if (docsOnly && gate !== 'test') return { status: 'success', reason: 'not-applicable-documentation' };
  const suite = REQUIRED[gate];
  const matches = (checks || []).filter(check => check.name === suite);
  const latest = matches.sort((a, b) => new Date(b.completed_at || b.started_at || 0) - new Date(a.completed_at || a.started_at || 0))[0];
  if (!latest || latest.status !== 'completed' || latest.conclusion !== 'success') {
    throw new Error(`BLOCKED: ${suite} must complete successfully; missing/failure/cancelled/skipped is not green`);
  }
  return { status: 'success', reason: 'suite-success' };
}

module.exports = { REQUIRED, isDocumentationOnly, evaluateGate };
