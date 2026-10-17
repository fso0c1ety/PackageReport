import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
const marker = `EGRESS_PHASE2_${process.env.GITHUB_RUN_ID || ''}`;
try { const result = await pool.query('DELETE FROM workspaces WHERE name LIKE $1', [`${marker}%`]); console.log(JSON.stringify({ deletedSyntheticWorkspaces: result.rowCount })); } finally { await pool.end(); }
