import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString || 'postgresql://postgres.gxzvlsukjodbarlcjyys:Kukupermu1234@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
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
