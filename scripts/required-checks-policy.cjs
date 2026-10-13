'use strict';

// Conservative dependency policy: only clearly non-executable documentation
// can avoid the expensive suites. Unknown/new paths always require all suites.
const CHECKS = Object.freeze(['test', 'portal-acceptance', 'kanban-postgres-e2e', 'clean-install', 'local-safety', 'benchmark']);

function classifyChanges(paths) {
  if (!Array.isArray(paths) || paths.length === 0 || paths.some(path =>
    typeof path !== 'string' || !path || path.includes('\\') || path.startsWith('/') ||
    path.split('/').some(part => part === '..' || part === '.' || !part))) {
    throw new Error('BLOCKED: complete, normalized changed paths are required');
  }
  const documentationOnly = paths.every(path =>
    /^(README|CONTRIBUTING|CHANGELOG)\.md$/.test(path) ||
    /^docs\/[A-Za-z0-9_./-]+\.md$/.test(path));
  return Object.fromEntries(CHECKS.map(check => [check,
    check === 'test' || !documentationOnly ? 'required' : 'not-applicable-documentation']));
}

function validateGate(policy, check, detectorResult, suiteResult) {
  if (detectorResult !== 'success' || !CHECKS.includes(check) || !policy ||
    !['required', 'not-applicable-documentation'].includes(policy[check])) {
    throw new Error('BLOCKED: relevance validation failed');
  }
  if (policy[check] === 'required' && suiteResult !== 'success') {
    throw new Error('BLOCKED: required suite did not pass');
  }
  if (policy[check] === 'not-applicable-documentation' && suiteResult !== 'skipped') {
    throw new Error('BLOCKED: unexpected documentation suite result');
  }
  return true;
}

module.exports = { CHECKS, classifyChanges, validateGate };
