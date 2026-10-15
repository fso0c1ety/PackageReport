function executionSql(file, sql) {
  if (file !== "002_backfill_empty_workspaces.sql") return sql;
  const legacyExpression = "EXTRACT(EPOCH FROM NOW()) * 1000,";
  const matches = sql.split(legacyExpression).length - 1;
  if (matches !== 1) throw new Error("Migration 002 legacy timestamp expression did not match exactly once");
  return sql.replace(legacyExpression, "NOW(),");
}

module.exports = { executionSql };
