const db = require('./server/db');

async function checkAutomations() {
    try {
        console.log('\n--- Checking Tables ---');
        const tables = await db.query('SELECT id, name FROM tables');
        console.log(JSON.stringify(tables.rows, null, 2));

        console.log('\n--- Checking Automations ---');
        const autos = await db.query('SELECT * FROM automations');
        console.log(JSON.stringify(autos.rows, null, 2));

        console.log('\n--- Checking Recent Activity Logs ---');
        const logs = await db.query('SELECT id, subject, recipients, timestamp FROM activity_logs ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(logs.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkAutomations();
