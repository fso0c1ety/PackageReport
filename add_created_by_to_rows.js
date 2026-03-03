const db = require('./server/db');

async function migrate() {
    try {
        console.log('Adding created_by column to rows table...');
        await db.query(`
            ALTER TABLE rows 
            ADD COLUMN IF NOT EXISTS created_by TEXT;
        `);
        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
