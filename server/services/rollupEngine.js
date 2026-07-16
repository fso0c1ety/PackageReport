function compact(values) {
  return (values || []).filter((value) => value !== null && value !== undefined && value !== "");
}

function numeric(values) {
  return compact(values).map(Number).filter(Number.isFinite);
}

function aggregate(values, operation) {
  const clean = compact(values);
  const nums = numeric(clean);
  switch (String(operation || "").toUpperCase()) {
    case "COUNT": return clean.length;
    case "COUNT_UNIQUE": return new Set(clean.map((value) => JSON.stringify(value))).size;
    case "SUM": return nums.reduce((sum, value) => sum + value, 0);
    case "AVERAGE": return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
    case "MIN": return nums.length ? Math.min(...nums) : null;
    case "MAX": return nums.length ? Math.max(...nums) : null;
    case "EARLIEST_DATE": return clean.length ? clean.map((value) => new Date(value)).filter((date) => !Number.isNaN(date.valueOf())).sort((a, b) => a - b)[0]?.toISOString() || null : null;
    case "LATEST_DATE": return clean.length ? clean.map((value) => new Date(value)).filter((date) => !Number.isNaN(date.valueOf())).sort((a, b) => b - a)[0]?.toISOString() || null : null;
    case "PERCENT_COMPLETE": return clean.length ? (clean.filter((value) => value === true || /^(done|complete|completed|finished)$/i.test(String(value))).length / clean.length) * 100 : 0;
    default: throw new Error(`Unsupported rollup operation: ${operation}`);
  }
}

function lookup(relatedRows, columnId) {
  return (relatedRows || []).map((row) => row?.values?.[columnId]).filter((value) => value !== undefined);
}

function rollup(relatedRows, columnId, operation) {
  return aggregate(lookup(relatedRows, columnId), operation);
}

module.exports = { aggregate, lookup, rollup };
