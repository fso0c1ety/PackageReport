import fs from 'node:fs';

const target = 'src/app/api/_lib/server.js';
const source = fs.readFileSync(target, 'utf8');
const marker = 'export function poolDiagnostics() {';
if (!source.includes(marker)) throw new Error('EGRESS5 probe marker not found');
if (source.includes('EGRESS5_DB_PROBE')) process.exit(0);
const probe = `const EGRESS5_PROBE_FILE = process.env.EGRESS5_DB_PROBE === "1" ? process.env.EGRESS5_QUERY_FILE : "";
let egress5QueryNumber = 0;
function egress5Record(result) {
  if (!EGRESS5_PROBE_FILE || !result) return;
  const rows = Array.isArray(result.rows) ? result.rows : [];
  const fields = Array.isArray(result.fields) ? result.fields.length : 0;
  fs.appendFileSync(EGRESS5_PROBE_FILE, JSON.stringify({ query: ++egress5QueryNumber, rows: rows.length, fields, resultBytes: Buffer.byteLength(JSON.stringify(rows)) }) + "\\n");
}
if (EGRESS5_PROBE_FILE && pool?.query) {
  const originalPoolQuery = pool.query.bind(pool);
  pool.query = async (...args) => { const result = await originalPoolQuery(...args); egress5Record(result); return result; };
  const originalPoolConnect = pool.connect.bind(pool);
  pool.connect = async (...args) => {
    const client = await originalPoolConnect(...args);
    if (!client.__egress5Patched) {
      const originalClientQuery = client.query.bind(client);
      client.query = async (...queryArgs) => { const result = await originalClientQuery(...queryArgs); egress5Record(result); return result; };
      client.__egress5Patched = true;
    }
    return client;
  };
}

`;
fs.writeFileSync(target, `import fs from "node:fs";\n${source.replace(marker, `${probe}${marker}`)}`);
