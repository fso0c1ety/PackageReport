const numeric = (value) => {
  if (value && typeof value === 'object') value = value.amount ?? value.value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function buildChartSeries(rows, { groupColumnId, measureColumnId, aggregation = 'count' } = {}) {
  const groups = new Map();
  for (const row of rows || []) {
    const rawGroup = groupColumnId ? row.values?.[groupColumnId] : 'All rows';
    const label = Array.isArray(rawGroup) ? rawGroup.map((item) => item?.name ?? item).join(', ') : String(rawGroup?.label ?? rawGroup ?? 'Unassigned');
    const current = groups.get(label) || { label, count: 0, total: 0 };
    current.count += 1;
    current.total += numeric(row.values?.[measureColumnId]);
    groups.set(label, current);
  }
  return [...groups.values()].map((item) => ({
    label: item.label,
    value: aggregation === 'sum' ? item.total : aggregation === 'average' ? (item.count ? item.total / item.count : 0) : item.count,
    count: item.count,
  })).sort((a, b) => b.value - a.value);
}

export function sanitizeFormSubmission(columns, input) {
  const values = {};
  const errors = {};
  for (const column of columns || []) {
    if (['Formula', 'Created date', 'Updated date', 'Created by', 'Last updated by'].includes(column.type)) continue;
    const value = input?.[column.id];
    if (column.settings?.required && (value === '' || value == null)) errors[column.id] = `${column.name} is required`;
    if (column.type === 'Email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) errors[column.id] = 'Enter a valid email';
    values[column.id] = value ?? '';
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}
