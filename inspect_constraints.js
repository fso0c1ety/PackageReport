const db = require('./server/db');

async function inspectConstraints() {
  try {
    const res = await db.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c 
      JOIN pg_namespace n ON n.oid = c.connamespace 
      WHERE conrelid = 'automations'::regclass
    `);
    console.log('--- Automations Constraints ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

inspectConstraints();
