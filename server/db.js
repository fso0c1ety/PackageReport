const { Pool } = require('pg');
const { getDatabaseUrl } = require('./config/env');
const logger = require('./utils/logger');
const metrics = require('./observability/metrics');

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
    logger.error('database_idle_client_error', { error: err.message });
});

async function query(text, params) {
    const startedAt = Date.now();
    try { return await pool.query(text, params); }
    finally {
        const durationMs = Date.now() - startedAt;
        metrics.timing('database_query_duration_ms', durationMs, { operation: String(text).trim().split(/\s+/)[0]?.toUpperCase() || 'UNKNOWN' });
        if (durationMs > Number(process.env.SLOW_QUERY_MS || 1000)) logger.warn('database_slow_query', { durationMs, operation: String(text).trim().split(/\s+/)[0] });
    }
}

module.exports = {
    query,
    pool: pool
};
