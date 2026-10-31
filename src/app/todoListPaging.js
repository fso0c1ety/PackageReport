const PAGE_SIZE = 100;

function taskPageRequest(tableId, page) {
  return `/tables/${encodeURIComponent(tableId)}/tasks?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`;
}

function normalizeTaskPage(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
}

function hasNextTaskPage(rows) {
  return rows.length === PAGE_SIZE;
}

function mergeTaskPage(current, rows, page) {
  const start = page * PAGE_SIZE;
  const next = current.slice();
  const seen = new Set(next.map((row) => row.id));
  rows.forEach((row, index) => {
    const position = start + index;
    if (position < next.length) next[position] = row;
    else if (!seen.has(row.id)) next.push(row);
    seen.add(row.id);
  });
  return next;
}

module.exports = { PAGE_SIZE, hasNextTaskPage, mergeTaskPage, normalizeTaskPage, taskPageRequest };
