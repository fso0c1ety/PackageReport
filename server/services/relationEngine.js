function relationKey(link) {
  return `${link.sourceRowId}:${link.sourceColumnId}:${link.targetTableId}:${link.targetRowId}`;
}

function normalizeLink(input) {
  const link = {
    sourceRowId: String(input?.sourceRowId || "").trim(),
    sourceColumnId: String(input?.sourceColumnId || "").trim(),
    targetTableId: String(input?.targetTableId || "").trim(),
    targetRowId: String(input?.targetRowId || "").trim(),
  };
  for (const [field, value] of Object.entries(link)) {
    if (!value) throw new Error(`${field} is required`);
  }
  return link;
}

function upsertRelation(relations, input, options = {}) {
  const link = normalizeLink(input);
  if (options.canLink && !options.canLink(link)) throw new Error("Relation permission denied");
  const result = new Map((relations || []).map((item) => {
    const normalized = normalizeLink(item);
    return [relationKey(normalized), normalized];
  }));
  result.set(relationKey(link), link);
  if (options.bidirectional) {
    const reverse = normalizeLink({
      sourceRowId: link.targetRowId,
      sourceColumnId: options.reverseColumnId || link.sourceColumnId,
      targetTableId: options.sourceTableId,
      targetRowId: link.sourceRowId,
    });
    result.set(relationKey(reverse), reverse);
  }
  return [...result.values()];
}

function removeRelation(relations, input, options = {}) {
  const link = normalizeLink(input);
  return (relations || []).filter((item) => {
    const current = normalizeLink(item);
    const direct = relationKey(current) === relationKey(link);
    const reverse = options.bidirectional
      && current.sourceRowId === link.targetRowId
      && current.targetRowId === link.sourceRowId
      && (!options.reverseColumnId || current.sourceColumnId === options.reverseColumnId);
    return !direct && !reverse;
  });
}

function cleanupRelations(relations, activeRowIds) {
  const active = activeRowIds instanceof Set ? activeRowIds : new Set(activeRowIds || []);
  return (relations || []).filter((item) => {
    const link = normalizeLink(item);
    return active.has(link.sourceRowId) && active.has(link.targetRowId);
  });
}

function relatedRowIds(relations, sourceRowId, sourceColumnId) {
  return (relations || [])
    .map(normalizeLink)
    .filter((link) => link.sourceRowId === sourceRowId && (!sourceColumnId || link.sourceColumnId === sourceColumnId))
    .map((link) => link.targetRowId);
}

module.exports = { cleanupRelations, normalizeLink, relationKey, relatedRowIds, removeRelation, upsertRelation };
