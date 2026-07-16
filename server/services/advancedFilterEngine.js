const text = (value) => Array.isArray(value) ? value.map((item) => item?.name ?? item?.label ?? item).join(' ') : String(value?.label ?? value?.name ?? value ?? '');
const number = (value) => { const parsed = Number(value?.amount ?? value?.value ?? value); return Number.isFinite(parsed) ? parsed : null; };

export function matchesCondition(row, condition, context = {}) {
  const raw = row?.values?.[condition.columnId];
  const actual = text(raw).toLowerCase();
  const expected = text(condition.value).toLowerCase();
  const numeric = number(raw);
  const target = number(condition.value);
  switch (condition.operator) {
    case 'equals': return actual === expected;
    case 'not_equals': return actual !== expected;
    case 'contains': return actual.includes(expected);
    case 'not_contains': return !actual.includes(expected);
    case 'greater_than': return numeric != null && target != null && numeric > target;
    case 'less_than': return numeric != null && target != null && numeric < target;
    case 'is_empty': return raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0);
    case 'is_not_empty': return !(raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0));
    case 'date_today': return new Date(raw).toDateString() === (context.now || new Date()).toDateString();
    case 'date_before': return new Date(raw).getTime() < new Date(condition.value).getTime();
    case 'date_after': return new Date(raw).getTime() > new Date(condition.value).getTime();
    case 'date_within': { const now = context.now || new Date(); const days = Number(condition.value || 7); const delta = new Date(raw).getTime() - now.getTime(); return delta >= 0 && delta <= days * 86400000; }
    case 'current_user': return Array.isArray(raw) ? raw.some((person) => String(person?.id ?? person) === String(context.userId)) : String(raw?.id ?? raw) === String(context.userId);
    case 'relation_contains': return Array.isArray(raw) && raw.some((relation) => String(relation?.rowId ?? relation?.id ?? relation) === String(condition.value));
    default: return false;
  }
}

export function applyFilterGroup(rows, group, context = {}) {
  const mode = String(group?.mode || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND';
  const items = group?.items || [];
  return (rows || []).filter((row) => {
    const results = items.map((item) => item.items ? applyFilterGroup([row], item, context).length === 1 : matchesCondition(row, item, context));
    return mode === 'OR' ? results.some(Boolean) : results.every(Boolean);
  });
}

export function normalizeUserPreferences(input = {}) {
  return {
    filters: input.filters && typeof input.filters === 'object' ? structuredClone(input.filters) : { mode: 'AND', items: [] },
    sort: Array.isArray(input.sort) ? input.sort : [], grouping: input.grouping || null,
    hiddenColumns: Array.isArray(input.hiddenColumns) ? [...new Set(input.hiddenColumns)] : [],
    columnOrder: Array.isArray(input.columnOrder) ? [...new Set(input.columnOrder)] : [],
    columnWidths: input.columnWidths && typeof input.columnWidths === 'object' ? { ...input.columnWidths } : {},
    frozenColumns: Array.isArray(input.frozenColumns) ? [...new Set(input.frozenColumns)] : [],
    selectedView: input.selectedView || 'table', density: ['compact','comfortable','spacious'].includes(input.density) ? input.density : 'comfortable',
    dashboardLayout: Array.isArray(input.dashboardLayout) ? input.dashboardLayout : [],
  };
}
