function getKanbanTaskTitle(value) {
  const values = Array.isArray(value) ? value : [value];
  const labels = values
    .map((item) => {
      if (item == null) return '';
      if (typeof item === 'object') return String(item.label ?? item.name ?? item.value ?? '').trim();
      return String(item).trim();
    })
    .filter(Boolean);
  return labels.length ? labels.join(', ') : 'Untitled';
}

module.exports = { getKanbanTaskTitle };
