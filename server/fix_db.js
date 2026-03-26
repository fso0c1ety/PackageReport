const db = require('./db');

async function fixSchema() {
    console.log('--- Database Schema Patch ---');
    try {
        console.log('1. Adding "fcm_tokens" column to store multiple device tokens (JSONB)...');
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS fcm_tokens JSONB DEFAULT '[]'::jsonb;
        `);

        console.log('2. Adding missing profile columns ("phone", "job_title", "company")...');
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS phone TEXT,
            ADD COLUMN IF NOT EXISTS job_title TEXT,
            ADD COLUMN IF NOT EXISTS company TEXT;
        `);

        console.log('3. Adding missing "invite_code" and "shared_users" columns to tables (if missing)...');
        await db.query(`
            ALTER TABLE tables 
            ADD COLUMN IF NOT EXISTS invite_code TEXT,
            ADD COLUMN IF NOT EXISTS shared_users JSONB DEFAULT '[]'::jsonb;
        `);

        console.log('4. Adding "created_by" and timestamp management to rows...');
        await db.query(`
            ALTER TABLE rows 
            ADD COLUMN IF NOT EXISTS created_by TEXT,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        `);

        console.log('5. Ensuring activity_logs has a "status" and "error_message"...');
        await db.query(`
            ALTER TABLE activity_logs 
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
            ADD COLUMN IF NOT EXISTS error_message TEXT;
        `);

        console.log('6. Adding sender_id to table_chats...');
        await db.query(`
            ALTER TABLE table_chats 
            ADD COLUMN IF NOT EXISTS sender_id TEXT;
        `);

        console.log('--- ALL PATCHES APPLIED SUCCESSFULLY ---');
    } catch (err) {
        console.error('--- PATCH FAILED ---', err);
    } finally {
        db.pool.end();
    }
}

fixSchema();
