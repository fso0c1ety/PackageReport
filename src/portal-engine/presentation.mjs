const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const DISPLAY_COLUMNS = ["Name", "Full Name", "Load ID", "Shipment ID", "Trip Number", "Child Name", "Patient Name", "Company", "Title", "Plate", "Email"];

const normalized = (value) => String(value || "").trim().toLowerCase();

export function stripRepeatedFieldLabel(fieldName, input) {
  const text = String(input ?? "").trim();
  if (!text) return "";
  const escaped = String(fieldName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`^${escaped}\\s*(?:—|–|-|:)\\s*`, "i"), "").trim();
}

export function isInternalIdentifier(value) {
  return UUID_RE.test(String(value || "").trim());
}

export function isIsoDateValue(value) {
  return typeof value === "string" && ISO_RE.test(value.trim()) && Number.isFinite(new Date(value).getTime());
}

export function portalRecordDisplay(row, table) {
  if (!row || !table) return "";
  const columns = Array.isArray(table.columns) ? table.columns : [];
  for (const wanted of DISPLAY_COLUMNS) {
    const target = columns.find((item) => normalized(item.name) === normalized(wanted));
    const candidate = target ? row.values?.[target.id] : undefined;
    if (["string", "number"].includes(typeof candidate) && String(candidate).trim() && !isInternalIdentifier(candidate)) return stripRepeatedFieldLabel(target.name, candidate);
  }
  for (const target of columns) {
    const candidate = row.values?.[target.id];
    if (["string", "number"].includes(typeof candidate) && String(candidate).trim() && !isInternalIdentifier(candidate) && !isIsoDateValue(candidate)) return stripRepeatedFieldLabel(target.name, candidate);
  }
  return "";
}

function safeText(fieldName, value) {
  const text = stripRepeatedFieldLabel(fieldName, value);
  if (/\bacceptance\b|parent-safe/i.test(text)) return "";
  return isInternalIdentifier(text) ? "Record" : text;
}

function relationIdentity(item) {
  if (item == null) return "";
  if (typeof item !== "object") return String(item);
  return String(item.rowId || item.recordId || item.id || item.userId || "");
}

export async function presentPortalValue({ fieldName, column = {}, rawValue, resolveRelation }) {
  if (rawValue == null || rawValue === "") return { kind: "empty", display: "—" };
  const type = normalized(column.type);
  const entries = Array.isArray(rawValue) ? rawValue : [rawValue];
  const isRelation = /relation|people|person|user/.test(type) || entries.some((entry) => entry && typeof entry === "object" && (entry.rowId || entry.recordId || entry.userId || entry.tableId || entry.tableName));
  if (isRelation) {
    const items = [];
    for (const entry of entries.slice(0, 25)) {
      const resolved = resolveRelation ? await resolveRelation(entry, column) : "";
      const embedded = entry && typeof entry === "object" ? entry.label || entry.name || entry.fullName || entry.email : entry;
      const display = safeText(fieldName, resolved || embedded || "");
      if (display && !isInternalIdentifier(display) && !items.includes(display)) items.push(display);
    }
    return items.length ? { kind: items.length > 1 ? "chips" : "text", display: items.join(", "), items } : { kind: "empty", display: "—" };
  }
  if (/date|timeline|created|updated/.test(type) || (/date|birthday|month/i.test(fieldName) && isIsoDateValue(rawValue))) {
    const timestamp = new Date(rawValue).getTime();
    return Number.isFinite(timestamp) ? { kind: String(rawValue).includes("T") ? "datetime" : "date", timestamp } : { kind: "empty", display: "—" };
  }
  if (/money|currency/.test(type)) {
    const amount = Number(rawValue);
    return Number.isFinite(amount) ? { kind: "currency", amount, currency: String(column.settings?.currency || "EUR") } : { kind: "text", display: safeText(fieldName, rawValue) || "—" };
  }
  if (/number|formula|progress|rating/.test(type) && Number.isFinite(Number(rawValue))) return { kind: "number", number: Number(rawValue) };
  if (/checkbox|boolean/.test(type) || typeof rawValue === "boolean") return { kind: "boolean", display: rawValue ? "Yes" : "No" };
  if (/file|image|attachment/.test(type)) {
    const files = entries.map((entry) => entry && typeof entry === "object" ? { name: safeText(fieldName, entry.name || entry.label || "Document") || "Document", url: typeof entry.url === "string" ? entry.url : "", type: String(entry.type || "") } : { name: safeText(fieldName, entry) || "Document", url: "", type: "" }).filter((file) => !isInternalIdentifier(file.name));
    return files.length ? { kind: "files", display: files.map((file) => file.name).join(", "), files } : { kind: "empty", display: "—" };
  }
  if (Array.isArray(rawValue)) {
    const items = rawValue.map((entry) => entry && typeof entry === "object" ? entry.label || entry.name || entry.address || "" : entry).map((entry) => safeText(fieldName, entry)).filter((entry) => entry && !isInternalIdentifier(entry));
    return items.length ? { kind: "chips", display: items.join(", "), items } : { kind: "empty", display: "—" };
  }
  if (typeof rawValue === "object") {
    const candidate = rawValue.label || rawValue.name || rawValue.fullName || rawValue.address || rawValue.email || rawValue.title;
    const display = safeText(fieldName, candidate || "");
    return display && !isInternalIdentifier(display) ? { kind: "text", display } : { kind: "empty", display: "—" };
  }
  if (isIsoDateValue(rawValue)) return { kind: String(rawValue).includes("T") ? "datetime" : "date", timestamp: new Date(rawValue).getTime() };
  const display = safeText(fieldName, rawValue);
  return display ? { kind: "text", display } : { kind: "empty", display: "—" };
}

export function relationTargetId(entry) {
  const id = relationIdentity(entry);
  return isInternalIdentifier(id) ? id : id;
}
