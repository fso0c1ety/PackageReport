const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://smartmanage_user:u0px8vQuENhbXmQtR3cLAUbJcSa39TSl@dpg-d6h1iucr85hc73978m90-a.oregon-postgres.render.com/smartmanage',
    ssl: { rejectUnauthorized: false }
});

async function checkLogs() {
    try {
        const res = await pool.query('SELECT *, TO_TIMESTAMP(CAST(timestamp AS BIGINT) / 1000) as readable_time FROM activity_logs ORDER BY id DESC LIMIT 10');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkLogs();
