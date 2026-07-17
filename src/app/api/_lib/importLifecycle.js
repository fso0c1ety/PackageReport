export function normalizeImportHeaders(headers = []) {
  const used = new Map();
  return headers.map((value, index) => {
    const base = String(value ?? "").trim() || `Column ${index + 1}`;
    const count = (used.get(base.toLowerCase()) || 0) + 1;
    used.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

export function applyColumnMapping(headers, rows, mapping = {}) {
  const selected = headers
    .map((header, index) => ({ source: header, index, target: String(mapping[header] ?? header).trim() }))
    .filter((entry) => entry.target);
  return {
    headers: normalizeImportHeaders(selected.map((entry) => entry.target)),
    rows: rows.map((row) => selected.map((entry) => row?.[entry.index] ?? "")),
  };
}

export function analyzeImportRows(headers, rows) {
  const accepted = [];
  const errors = [];
  const duplicates = [];
  const fingerprints = new Set();
  rows.forEach((row, index) => {
    const normalized = headers.map((_, columnIndex) => String(row?.[columnIndex] ?? "").trim());
    if (!normalized.some(Boolean)) return;
    const fingerprint = JSON.stringify(normalized.map((value) => value.toLowerCase()));
    if (fingerprints.has(fingerprint)) {
      duplicates.push({ row: index + 2, reason: "Duplicate row in import file" });
      return;
    }
    fingerprints.add(fingerprint);
    if (normalized.length !== headers.length) {
      errors.push({ row: index + 2, reason: "Column count does not match header" });
      return;
    }
    accepted.push(normalized);
  });
  return { accepted, duplicates, errors, total: rows.length };
}

export function parseTemplateJson(value) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || !Array.isArray(parsed.columns) || !Array.isArray(parsed.rows)) throw new Error("Invalid Smart Manage template JSON");
  const headers = parsed.columns.map((column) => String(column?.name ?? column ?? "").trim());
  if (!headers.length || headers.some((header) => !header)) throw new Error("Template JSON columns require names");
  const rows = parsed.rows.map((row) => headers.map((header, index) => row?.values?.[header] ?? row?.[header] ?? row?.[index] ?? ""));
  return { headers, rows, name: String(parsed.name || "Imported Template").slice(0, 120) };
}
