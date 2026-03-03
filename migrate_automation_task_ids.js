const db = require('./server/db');

async function migrate_task_ids() {
    try {
        console.log('Adding task_ids column to automations table...');
        await db.query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS task_ids JSONB DEFAULT '[]'::jsonb;`);
        
        console.log('Migrating existing task_id to task_ids...');
        // Updates rows where task_id is not null and task_ids is empty
        await db.query(`
            UPDATE automations 
            SET task_ids = jsonb_build_array(task_id) 
            WHERE task_id IS NOT NULL AND (task_ids IS NULL OR jsonb_array_length(task_ids) = 0);
        `);
        
        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate_task_ids();
