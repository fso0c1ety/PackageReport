const DIAGNOSTIC_FIELDS = [
  "route_label",
  "request_kind",
  "status",
  "total_ms",
  "auth_ms",
  "db_acquire_ms",
  "authorization_ms",
  "query_ms",
  "serialization_ms",
  "error_name",
  "error_code",
  "error_category",
];

const now = () => Number(process.hrtime.bigint()) / 1_000_000;

function errorCategory(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || message.includes("timeout") || message.includes("connect")) return "db_connection";
  if (code) return "database";
  return "runtime";
}

function createPerfDiagnostic(routeLabel, requestKind) {
  if (!routeLabel || !requestKind) return null;
  const startedAt = now();
  const marks = new Map();
  let finished = false;

  const mark = (name) => marks.set(name, now());
  const duration = (start, end) => marks.has(start) && marks.has(end)
    ? Math.max(0, Math.round((marks.get(end) - marks.get(start)) * 100) / 100)
    : null;

  const finish = (status, error) => {
    if (finished) return;
    finished = true;
    const endedAt = now();
    const record = {
      route_label: routeLabel,
      request_kind: requestKind,
      status,
      total_ms: Math.max(0, Math.round((endedAt - startedAt) * 100) / 100),
      auth_ms: duration("auth_start", "auth_end"),
      db_acquire_ms: duration("db_acquire_start", "db_acquire_end"),
      authorization_ms: duration("authorization_start", "authorization_end"),
      query_ms: duration("query_start", "query_end"),
      serialization_ms: duration("serialization_start", "serialization_end"),
    };
    if (error) {
      record.error_name = typeof error.name === "string" ? error.name : "Error";
      record.error_code = typeof error.code === "string" ? error.code : null;
      record.error_category = errorCategory(error);
    }
    console.info("[PERF_DIAGNOSTIC]", JSON.stringify(Object.fromEntries(
      DIAGNOSTIC_FIELDS.filter((field) => record[field] !== undefined).map((field) => [field, record[field]])
    )));
  };

  return { mark, finish };
}

module.exports = { createPerfDiagnostic };
