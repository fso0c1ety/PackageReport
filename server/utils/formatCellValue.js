function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .trim();
}

function parseStoredValue(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !["[", "{"].includes(trimmed[0])) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function formatDate(value) {
  if (!value) return "—";
  const raw = typeof value === "object" && value !== null
    ? value.value ?? value.date ?? ""
    : value;
  if (!raw) return "—";

  const dateOnlyMatch = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPerson(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return String(value.name || value.label || value.email || "").trim();
  }
  return String(value);
}

function formatCellValue(rawValue, column = {}) {
  const value = parseStoredValue(rawValue);
  if (value === null || value === undefined || value === "") return "—";
  const type = String(column.type || "").toLowerCase();

  if (type === "date") return formatDate(value);

  if (type === "timeline") {
    if (!value || typeof value !== "object") return "—";
    const start = formatDate(value.start);
    const end = formatDate(value.end);
    return start === "—" && end === "—" ? "—" : `${start} – ${end}`;
  }

  if (type === "people" || type === "person") {
    const people = Array.isArray(value) ? value : [value];
    const names = people.map(formatPerson).filter(Boolean);
    return names.length > 0 ? names.join(", ") : "—";
  }

  if (type === "files") {
    const files = Array.isArray(value) ? value : [value];
    const names = files
      .map((file) => typeof file === "string" ? file : file?.name || file?.originalName)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "—";
  }

  if (Array.isArray(value)) {
    const formatted = value.map((item) => {
      if (item && typeof item === "object") {
        return item.label ?? item.value ?? item.name ?? item.email ?? "";
      }
      return item;
    }).filter((item) => item !== "" && item !== null && item !== undefined);
    return formatted.length > 0 ? formatted.join(", ") : "—";
  }

  if (typeof value === "object") {
    const readable = value.label ?? value.value ?? value.name ?? value.email ?? value.title;
    return readable === null || readable === undefined || readable === "" ? "—" : String(readable);
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function normalizeActivityHtml(html, columns = []) {
  if (!html) return "";
  return String(html).replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (rowHtml) => {
    const cells = Array.from(rowHtml.matchAll(/(<td\b[^>]*>)([\s\S]*?)(<\/td>)/gi));
    if (cells.length < 2) return rowHtml;

    const label = decodeHtml(cells[0][2]);
    const column = columns.find((candidate) => String(candidate?.name || "") === label) || {};
    const rawValue = decodeHtml(cells[1][2]);
    const formattedValue = escapeHtml(formatCellValue(rawValue, column));
    const valueCell = cells[1][0];
    const replacement = `${cells[1][1]}${formattedValue}${cells[1][3]}`;
    return rowHtml.replace(valueCell, replacement);
  });
}

module.exports = {
  escapeHtml,
  formatCellValue,
  normalizeActivityHtml,
};
