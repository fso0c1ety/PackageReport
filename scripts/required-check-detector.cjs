'use strict';

const GATES = Object.freeze(['test', 'portal-acceptance', 'kanban-postgres-e2e', 'clean-install', 'local-safety', 'benchmark']);

function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0) throw new Error('BLOCKED: complete changed-file list is required');
  return files.flatMap(file => {
    if (!file || typeof file.filename !== 'string' || !['added', 'modified', 'deleted', 'renamed'].includes(file.status)) {
      throw new Error('BLOCKED: malformed changed-file entry');
    }
    if (file.status === 'renamed' && typeof file.previous_filename !== 'string') throw new Error('BLOCKED: rename source missing');
    return [file.filename, ...(file.status === 'renamed' ? [file.previous_filename] : [])];
  });
}

function detect({ base, head, files }) {
  if (!/^[a-f0-9]{40}$/.test(base || '') || !/^[a-f0-9]{40}$/.test(head || '')) throw new Error('BLOCKED: base/head SHA is not a full verified SHA');
  const paths = validateFiles(files);
  const docsOnly = paths.every(path => /^(README|CONTRIBUTING|CHANGELOG)\.md$/.test(path) || /^docs\/[A-Za-z0-9_./-]+\.md$/.test(path));
  return { base, head, paths, docsOnly, heavy: !docsOnly, gates: GATES };
}

module.exports = { GATES, detect, validateFiles };
