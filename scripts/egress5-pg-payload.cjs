const fs = require('node:fs');
const pg = require('pg');

const output = process.env.EGRESS5_QUERY_FILE;
if (output && !globalThis.__egress5PgPatched) {
  globalThis.__egress5PgPatched = true;
  const originalQuery = pg.Client.prototype.query;
  let queryNumber = 0;
  pg.Client.prototype.query = function patchedQuery(...args) {
    const result = originalQuery.apply(this, args);
    if (result && typeof result.then === 'function') {
      return result.then((response) => {
        const rows = Array.isArray(response?.rows) ? response.rows : [];
        const fields = Array.isArray(response?.fields) ? response.fields.length : 0;
        fs.appendFileSync(output, `${JSON.stringify({ query: ++queryNumber, rows: rows.length, fields, resultBytes: Buffer.byteLength(JSON.stringify(rows)) })}\n`);
        return response;
      });
    }
    return result;
  };
}
