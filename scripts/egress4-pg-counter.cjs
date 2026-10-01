/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const pg = require('pg');
const original = pg.Client.prototype.query;
const file = process.env.EGRESS4_QUERY_FILE;
let counter = 0;
pg.Client.prototype.query = function patchedQuery(...args) {
  if (file) fs.appendFileSync(file, `${++counter}\t${Date.now()}\n`);
  return original.apply(this, args);
};
