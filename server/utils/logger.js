const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "apiKey",
  "api_key",
]);

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      SENSITIVE_KEYS.has(key) ? "[REDACTED]" : redact(entryValue),
    ])
  );
}

function write(level, message, meta = {}) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...redact(meta),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

module.exports = {
  debug: (message, meta) => {
    if (process.env.LOG_LEVEL === "debug") write("debug", message, meta);
  },
  error: (message, meta) => write("error", message, meta),
  info: (message, meta) => write("info", message, meta),
  redact,
  warn: (message, meta) => write("warn", message, meta),
};
