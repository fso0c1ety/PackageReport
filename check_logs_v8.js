const db = require('./server/db');

(async () => {
    try {
        const result = await db.query('SELECT status, error_message, timestamp, subject, recipients FROM activity_logs ORDER BY timestamp DESC LIMIT 3');
        console.log('--- LATEST ACTIVITY LOGS ---');
        result.rows.forEach(row => {
            console.log(`Time: ${new Date(parseInt(row.timestamp)).toISOString()}`);
            console.log(`Recipients: ${JSON.stringify(row.recipients)}`);
            console.log(`Status: ${row.status}`);
            console.log(`Error: ${row.error_message || 'None'}`);
            console.log('-----------------------------');
        });
        process.exit(0);
    } catch (err) {
        console.error('Error querying DB:', err);
        process.exit(1);
    }
})();
