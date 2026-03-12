const db = require('./server/db');

async function migrate() {
    console.log("Running migrations...");
    try {
        // Friends table
        await db.query(`
      CREATE TABLE IF NOT EXISTS friends (
        id UUID PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        friend_id TEXT REFERENCES users(id),
        status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      );
    `);

        // Direct Messages table
        await db.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id UUID PRIMARY KEY,
        sender_id TEXT REFERENCES users(id),
        recipient_id TEXT REFERENCES users(id),
        text TEXT,
        timestamp BIGINT,
        read BOOLEAN DEFAULT false
      );
    `);

        console.log("SUCCESS: Migrations applied.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        process.exit();
    }
}

migrate();
