import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

let pool;

function getPool() {
  if (!pool) {
    if (!connectionString && process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL environment variable is required in production');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    pool.on('error', (err) => {
      console.error('Unexpected error on idle pg client', err);
    });
  }
  return pool;
}

export default {
  query: (text, params) => getPool().query(text, params),
  get pool() { return getPool(); },
};
