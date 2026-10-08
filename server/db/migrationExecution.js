function executionSql(file, sql) {
  if (file !== "002_backfill_empty_workspaces.sql") return sql;
  return sql.replace("EXTRACT(EPOCH FROM NOW()) * 1000,", "NOW(),");
}

module.exports = { executionSql };
