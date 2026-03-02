const db = require('./server/db');

async function inspectSchema() {
    try {
        console.log('\n--- Checking Notifications Schema ---');
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications'
        `);
        console.log(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

inspectSchema();
