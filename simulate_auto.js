const { Pool } = require('pg');
const { sendEmail } = require('./server/mailer');

const pool = new Pool({
    connectionString: 'postgresql://smartmanage_user:u0px8vQuENhbXmQtR3cLAUbJcSa39TSl@dpg-d6h1iucr85hc73978m90-a.oregon-postgres.render.com/smartmanage',
    ssl: { rejectUnauthorized: false }
});

const TABLE_ID = '43270b9c-3951-4a16-b917-d0f9bc73ee1a';
const TASK_ID = 'e1541cc8-771a-49c8-addb-8e56872935fe';

async function simulate() {
    console.log('--- Simulating Automation Trigger ---');
    try {
        // 1. Get task
        const rowRes = await pool.query('SELECT * FROM rows WHERE id = $1', [TASK_ID]);
        const row = rowRes.rows[0];
        const oldValues = row.values;

        // 2. Change status to trigger automation
        const newStatus = oldValues.status === 'Done' ? 'Working on it' : 'Done';
        const newValues = { ...oldValues, status: newStatus };

        console.log(`Changing status from "${oldValues.status}" to "${newStatus}"`);

        // 3. Update DB
        await pool.query('UPDATE rows SET values = $1 WHERE id = $2', [JSON.stringify(newValues), TASK_ID]);

        // 4. Find automation
        const autoRes = await pool.query('SELECT * FROM automations WHERE (task_id = $1 OR (table_id = $2 AND task_id IS NULL)) AND enabled = true', [TASK_ID, TABLE_ID]);
        const automation = autoRes.rows[0];

        if (automation) {
            console.log('Automation found:', automation.id);
            const recipients = automation.recipients;
            const subject = 'TEST: Task updated via simulator';
            const html = '<h2>Simulator Test</h2><p>This is a test from the simulator script.</p>';

            // Log pending
            const logRes = await pool.query(
                'INSERT INTO activity_logs (recipients, subject, html, timestamp, table_id, task_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                [JSON.stringify(recipients), subject, html, Date.now(), TABLE_ID, TASK_ID, 'pending']
            );
            const logId = logRes.rows[0].id;

            try {
                await sendEmail({ to: recipients, subject, html });
                await pool.query('UPDATE activity_logs SET status = $1 WHERE id = $2', ['sent', logId]);
                console.log('SUCCESS: Email sent and log updated to "sent"');
            } catch (mailErr) {
                console.error('FAILED: Email send error:', mailErr);
                await pool.query('UPDATE activity_logs SET status = $1, error_message = $2 WHERE id = $3', ['error', mailErr.message, logId]);
            }
        } else {
            console.log('No enabled automation found for this task/table');
        }

    } catch (err) {
        console.error('Simulator Error:', err);
    } finally {
        await pool.end();
    }
}

simulate();
