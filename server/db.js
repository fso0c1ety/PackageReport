const { Pool } = require('pg');
const { getDatabaseUrl } = require('./config/env');

const configuredConnectionString = getDatabaseUrl();
const dbUrl = new URL(configuredConnectionString);
const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(dbUrl.hostname);

// The local PostgreSQL Windows service uses its standard port. Keep remote
// connection strings untouched, but allow local development to override the
// stale port that may still be present in an existing .env file.
if (isLocalDatabase && process.env.LOCAL_DATABASE_PORT) {
    dbUrl.port = process.env.LOCAL_DATABASE_PORT;
} else if (isLocalDatabase && dbUrl.port === '5433') {
    dbUrl.port = '5432';
}
if (isLocalDatabase && !dbUrl.password && process.env.LOCAL_DATABASE_PASSWORD) {
    dbUrl.password = process.env.LOCAL_DATABASE_PASSWORD;
}

const pool = new Pool({
    connectionString: dbUrl.toString(),
    ssl: isLocalDatabase ? false : {
        rejectUnauthorized: false // Required for Supabase and Render
    }
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};
