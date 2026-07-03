const db = require('./server/db');

async function updateSchema() {
  try {
    console.log('Adding action_type column...');
    await db.query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'email';`);

    console.log('Dropping unique indexes...');
    await db.query(`DROP INDEX IF EXISTS idx_automations_table_only;`);
    await db.query(`DROP INDEX IF EXISTS idx_automations_table_task;`);

    console.log('Schema update complete.');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    process.exit();
  }
}

updateSchema();
