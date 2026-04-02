import { Pool } from 'pg';

if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.warn('[Config] DATABASE_URL is not set — using the default connection string. Set DATABASE_URL in your Vercel environment variables for production.');
}

const connectionString = process.env.DATABASE_URL ||
  'postgresql://postgres.gxzvlsukjodbarlcjyys:Kukupermu1234@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

// Only use SSL for cloud/remote database connections, not for localhost
const isLocalConnection =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const sslConfig = isLocalConnection ? false : { rejectUnauthorized: false };

let pool;

function getPool() {
  if (!pool) {
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
