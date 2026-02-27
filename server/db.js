const { Pool } = require('pg');

// Use environment variable for the connection string in production
// For the migration script and local testing, we fall back to the provided string
const connectionString = process.env.DATABASE_URL || 'postgresql://smartmanage_user:u0px8vQuENhbXmQtR3cLAUbJcSa39TSl@dpg-d6h1iucr85hc73978m90-a.oregon-postgres.render.com/smartmanage';

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Required for Render/many cloud DBs
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};
