const COLUMN_TYPES = Object.freeze([
  "Text", "LongText", "Number", "Numbers", "Status", "Dropdown", "MultiSelect",
  "People", "Email", "Phone", "Website", "Money", "Formula", "Progress", "Tags",
  "Location", "Country", "Date", "DateRange", "CreatedDate", "UpdatedDate", "Files",
  "Image", "Rating", "Color", "Checkbox", "QR", "Barcode", "Relation", "Lookup",
  "Rollup", "AutoNumber", "CreatedBy", "LastUpdatedBy",
]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function normalizeCellValue(type, value, settings = {}) {
  if (value == null || value === "") return null;
  switch (type) {
    case "Money": {
      if (isObject(value)) return { amount: Number(value.amount), currency: String(value.currency || settings.currency || "EUR") };
      return { amount: Number(value), currency: String(settings.currency || "EUR") };
    }
    case "People":
    case "CreatedBy":
    case "LastUpdatedBy":
      return { userIds: Array.isArray(value?.userIds) ? [...new Set(value.userIds.map(String))] : [String(value)] };
    case "Phone":
      if (isObject(value)) return { countryCode: String(value.countryCode || ""), number: String(value.number || ""), formatted: String(value.formatted || `${value.countryCode || ""} ${value.number || ""}`).trim() };
      return { countryCode: "", number: String(value).replace(/[^0-9]/g, ""), formatted: String(value).trim() };
    case "Location":
      return isObject(value) ? { label: String(value.label || value.address || ""), address: String(value.address || ""), city: String(value.city || ""), region: String(value.region || ""), countryCode: String(value.countryCode || ""), countryName: String(value.countryName || ""), latitude: value.latitude == null ? null : Number(value.latitude), longitude: value.longitude == null ? null : Number(value.longitude) } : { label: String(value), address: String(value), city: "", region: "", countryCode: "", countryName: "", latitude: null, longitude: null };
    case "Files":
      return { files: Array.isArray(value?.files) ? value.files : Array.isArray(value) ? value : [] };
    case "MultiSelect":
    case "Tags":
      return { values: [...new Set((Array.isArray(value?.values) ? value.values : Array.isArray(value) ? value : [value]).map(String))] };
    case "DateRange":
      return { start: value?.start ? String(value.start) : null, end: value?.end ? String(value.end) : null };
    case "Relation":
      return { rowIds: [...new Set((Array.isArray(value?.rowIds) ? value.rowIds : Array.isArray(value) ? value : [value]).map(String))] };
    case "Checkbox":
      return Boolean(value);
    case "Number":
    case "Numbers":
    case "Progress":
    case "Rating":
    case "AutoNumber":
      return Number(value);
    default:
      return value;
  }
}

function validateCellValue(type, value, settings = {}) {
  if (!COLUMN_TYPES.includes(type)) return { valid: false, error: `Unsupported column type: ${type}` };
  if (value == null) return { valid: !settings.required, error: settings.required ? "Value is required" : null };
  if (type === "Money" && (!Number.isFinite(value.amount) || !value.currency)) return { valid: false, error: "Money requires amount and currency" };
  if (["Number", "Numbers", "Progress", "Rating", "AutoNumber"].includes(type) && !Number.isFinite(value)) return { valid: false, error: "A valid number is required" };
  if (type === "Progress" && (value < 0 || value > 100)) return { valid: false, error: "Progress must be between 0 and 100" };
  if (type === "Rating" && (value < 0 || value > (settings.maxRating || 5))) return { valid: false, error: `Rating must be between 0 and ${settings.maxRating || 5}` };
  if (type === "Email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return { valid: false, error: "Invalid email address" };
  if (type === "Website") { try { const url = new URL(String(value)); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); } catch { return { valid: false, error: "Invalid website URL" }; } }
  if (type === "DateRange" && value.start && value.end && new Date(value.start) > new Date(value.end)) return { valid: false, error: "Start date must be before end date" };
  return { valid: true, error: null };
}

function toExportValue(type, value) {
  if (value == null) return "";
  if (type === "Money") return `${value.amount} ${value.currency}`;
  if (["People", "CreatedBy", "LastUpdatedBy"].includes(type)) return (value.userIds || []).join(", ");
  if (type === "Phone") return value.formatted || `${value.countryCode || ""} ${value.number || ""}`.trim();
  if (type === "Location") return value.label || value.address || "";
  if (type === "Files") return (value.files || []).map((file) => file.name || file.url).join(", ");
  if (["MultiSelect", "Tags"].includes(type)) return (value.values || []).join(", ");
  if (type === "DateRange") return [value.start, value.end].filter(Boolean).join(" - ");
  if (type === "Relation") return (value.rowIds || []).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function compareCellValues(type, left, right) {
  const a = type === "Money" ? left?.amount : left;
  const b = type === "Money" ? right?.amount : right;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (["Number", "Numbers", "Money", "Progress", "Rating", "AutoNumber"].includes(type)) return Number(a) - Number(b);
  return toExportValue(type, a).localeCompare(toExportValue(type, b), undefined, { numeric: true, sensitivity: "base" });
}

function matchesFilter(type, value, operator, expected) {
  const exported = toExportValue(type, value).toLowerCase();
  const target = toExportValue(type, expected).toLowerCase();
  if (operator === "is_empty") return value == null || exported === "";
  if (operator === "is_not_empty") return value != null && exported !== "";
  if (operator === "contains") return exported.includes(target);
  if (operator === "does_not_contain") return !exported.includes(target);
  if (operator === "equals") return compareCellValues(type, value, expected) === 0;
  if (operator === "does_not_equal") return compareCellValues(type, value, expected) !== 0;
  if (operator === "greater_than") return compareCellValues(type, value, expected) > 0;
  if (operator === "less_than") return compareCellValues(type, value, expected) < 0;
  if (operator === "date_before") return new Date(exported) < new Date(target);
  if (operator === "date_after") return new Date(exported) > new Date(target);
  return false;
}

module.exports = { COLUMN_TYPES, compareCellValues, matchesFilter, normalizeCellValue, toExportValue, validateCellValue };
