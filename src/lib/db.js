import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

// Only use SSL for cloud/remote database connections, not for localhost
const isLocalConnection =
  connectionString &&
  (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));

const sslConfig = (!connectionString || isLocalConnection) ? false : { rejectUnauthorized: false };

let pool;

function getPool() {
  if (!pool) {
    if (!connectionString && process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL environment variable is required in production');
    }
    pool = new Pool({
      connectionString,
      ssl: sslConfig,
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
