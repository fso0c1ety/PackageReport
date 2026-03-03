const db = require('./server/db');

async function inspectIndexes() {
  try {
    const res = await db.query(`
      SELECT * FROM pg_indexes WHERE tablename = 'automations'
    `);
    console.log('--- Automations Indexes ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

inspectIndexes();
