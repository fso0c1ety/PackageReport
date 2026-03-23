const db = require('./server/db');

async function checkTokens() {
    try {
        const res = await db.query('SELECT id, name, fcm_token, fcm_tokens FROM users WHERE fcm_token IS NOT NULL OR fcm_tokens IS NOT NULL');
        console.log(`Found ${res.rows.length} users with tokens:`);
        res.rows.forEach(u => {
            console.log(`- ${u.name} (ID: ${u.id}): fcm_token: ${u.fcm_token ? 'YES' : 'NO'}, fcm_tokens count: ${Array.isArray(u.fcm_tokens) ? u.fcm_tokens.length : 0}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error checking tokens:', err);
        process.exit(1);
    }
}

checkTokens();
