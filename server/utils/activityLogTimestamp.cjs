const NUMERIC_TIMESTAMP_TYPES = new Set(["smallint", "integer", "bigint", "numeric"]);
const timestampTypeCache = new WeakMap();

function normalizeActivityLogTimestamp(dataType, now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(instant.getTime())) throw new TypeError("Invalid activity log timestamp");
  return NUMERIC_TIMESTAMP_TYPES.has(String(dataType || "").toLowerCase())
    ? instant.getTime()
    : instant;
}

async function activityLogTimestampForDatabase(database, now = new Date()) {
  if (!database || typeof database.query !== "function") throw new TypeError("Database query interface is required");
  let dataType = timestampTypeCache.get(database);
  if (!dataType) {
    const result = await database.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'activity_logs'
        AND column_name = 'timestamp'
      LIMIT 1
    `);
    dataType = result.rows[0]?.data_type || "timestamp with time zone";
    timestampTypeCache.set(database, dataType);
  }
  return normalizeActivityLogTimestamp(dataType, now);
}

module.exports = {
  activityLogTimestampForDatabase,
  normalizeActivityLogTimestamp,
};
