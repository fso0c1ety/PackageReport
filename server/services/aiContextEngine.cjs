const CAPABILITIES = Object.freeze(["summary","email","translate","autofill","reports","expense_analysis","delayed_loads","document_summary","missing_fields","data_cleanup","formula_assistant","automation_assistant"]);
const capabilitySet = new Set(CAPABILITIES);

function normalizeCapability(value) { return capabilitySet.has(String(value)) ? String(value) : "summary"; }
function safeArray(value) { return Array.isArray(value) ? value : []; }
function buildWorkspaceContext({ workspace, tables = [], rows = [], maxRows = 100 } = {}) {
  const allowedTableIds = new Set(safeArray(tables).map((table) => String(table.id)));
  const safeRows = safeArray(rows).filter((row) => allowedTableIds.has(String(row.table_id))).slice(0, maxRows).map((row) => ({ id: row.id, tableId: row.table_id, values: row.values || {} }));
  return { workspace: workspace ? { id: workspace.id, name: workspace.name } : null, boards: safeArray(tables).map((table) => ({ id: table.id, name: table.name, columns: safeArray(table.columns).map(({ id, name, type }) => ({ id, name, type })), document: String(table.doc_content || "").slice(0,10000) })), rows: safeRows, rowCount: safeRows.length };
}
function findMissingFields(context) {
  const missing = [];
  for (const row of context.rows || []) for (const board of context.boards || []) if (String(board.id) === String(row.tableId)) for (const column of board.columns || []) if (row.values?.[column.id] == null || row.values?.[column.id] === "") missing.push({ rowId: row.id, boardId: board.id, columnId: column.id, columnName: column.name });
  return missing.slice(0, 100);
}
function buildDeterministicInsight(capability, context) {
  const missing = findMissingFields(context);
  return { capability: normalizeCapability(capability), workspace: context.workspace?.name || "Workspace", boards: context.boards?.length || 0, rowsReviewed: context.rows?.length || 0, missingFields: missing.length, response: `Reviewed ${context.rows?.length || 0} rows across ${context.boards?.length || 0} boards. ${missing.length} missing fields need attention.` };
}
module.exports = { CAPABILITIES, normalizeCapability, buildWorkspaceContext, findMissingFields, buildDeterministicInsight };
