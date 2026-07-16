const { randomUUID } = require("crypto");

function selectedRows(rows, selectedIds) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
  return (rows || []).filter((row) => selected.has(row.id));
}

function bulkUpdate(rows, selectedIds, patch) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
  return (rows || []).map((row) => selected.has(row.id) ? {
    ...row,
    ...patch,
    values: patch?.values ? { ...(row.values || {}), ...patch.values } : row.values,
  } : row);
}

function bulkArchive(rows, selectedIds, archived = true) {
  return bulkUpdate(rows, selectedIds, { archived, archived_at: archived ? new Date().toISOString() : null });
}

function duplicateRows(rows, selectedIds, idFactory = randomUUID) {
  const selected = selectedRows(rows, selectedIds);
  const copies = selected.map((row) => ({
    ...row,
    id: idFactory(),
    title: row.title ? `${row.title} (copy)` : row.title,
    values: { ...(row.values || {}) },
    created_at: undefined,
    updated_at: undefined,
  }));
  return [...(rows || []), ...copies];
}

function moveRowsToGroup(rows, selectedIds, groupId) {
  return bulkUpdate(rows, selectedIds, { group_id: groupId || null });
}

function createHistory(limit = 50) {
  let past = [];
  let future = [];
  return {
    push(snapshot) { past = [...past, structuredClone(snapshot)].slice(-limit); future = []; },
    undo(current) { if (!past.length) return current; const previous = past.at(-1); past = past.slice(0, -1); future = [structuredClone(current), ...future].slice(0, limit); return structuredClone(previous); },
    redo(current) { if (!future.length) return current; const next = future[0]; future = future.slice(1); past = [...past, structuredClone(current)].slice(-limit); return structuredClone(next); },
    state() { return { canUndo: past.length > 0, canRedo: future.length > 0 }; },
  };
}

module.exports = { bulkArchive, bulkUpdate, createHistory, duplicateRows, moveRowsToGroup, selectedRows };
