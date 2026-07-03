const db = require('./server/db');

(async () => {
    try {
        const result = await db.query('SELECT status, error_message, timestamp, subject FROM activity_logs ORDER BY timestamp DESC LIMIT 3');
        console.log('--- LATEST ACTIVITY LOGS ---');
        result.rows.forEach(row => {
            console.log(`Subject: ${row.subject}`);
            console.log(`Status: ${row.status}`);
            console.log(`Time: ${new Date(parseInt(row.timestamp)).toISOString()}`);
            console.log(`Error: ${row.error_message || 'None'}`);
            console.log('-----------------------------');
        });
        process.exit(0);
    } catch (err) {
        console.error('Error querying DB:', err);
        process.exit(1);
    }
})();
