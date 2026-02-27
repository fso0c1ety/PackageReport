const fs = require('fs');
const path = require('path');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, 'data');

async function migrate() {
    console.log('Starting migration to PostgreSQL...');

    try {
        /*
        // 1. Drop existing tables if they exist (ONLY USE FOR FRESH MIGRATION)
        await db.query(`
            DROP TABLE IF EXISTS table_chats;
            DROP TABLE IF EXISTS automations;
            DROP TABLE IF EXISTS activity_logs;
            DROP TABLE IF EXISTS rows;
            DROP TABLE IF EXISTS tables;
            DROP TABLE IF EXISTS workspaces;
            DROP TABLE IF EXISTS users;
        `);
        console.log('Existing tables dropped for fresh migration.');
        */

        // 2. Create Tables
        await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        avatar TEXT,
        password TEXT
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT,
        owner_id TEXT REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        name TEXT,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        columns JSONB,
        created_at BIGINT,
        doc_content TEXT
      );

      CREATE TABLE IF NOT EXISTS rows (
        id TEXT PRIMARY KEY,
        table_id TEXT REFERENCES tables(id) ON DELETE CASCADE,
        values JSONB
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        recipients JSONB,
        subject TEXT,
        html TEXT,
        timestamp BIGINT,
        table_id TEXT,
        task_id TEXT
      );

      CREATE TABLE IF NOT EXISTS automations (
        id SERIAL PRIMARY KEY,
        table_id TEXT REFERENCES tables(id) ON DELETE CASCADE,
        task_id TEXT,
        trigger_col TEXT,
        enabled BOOLEAN,
        recipients JSONB,
        cols JSONB
      );

      CREATE TABLE IF NOT EXISTS table_chats (
        id TEXT PRIMARY KEY,
        table_id TEXT REFERENCES tables(id) ON DELETE CASCADE,
        sender TEXT,
        text TEXT,
        timestamp BIGINT
      );
    `);
        console.log('Tables created or already exist.');

        // 2. Migrate Users
        const people = JSON.parse(fs.readFileSync(path.join(dataDir, 'people.json'), 'utf8'));
        for (const person of people) {
            await db.query(
                'INSERT INTO users (id, name, email, avatar, password) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET name = $2, avatar = $4, password = $5',
                [person.id, person.name, person.email, person.avatar, person.password]
            );
        }
        console.log(`Migrated ${people.length} users.`);

        // 3. Migrate Workspaces
        const workspaces = JSON.parse(fs.readFileSync(path.join(dataDir, 'workspaces.json'), 'utf8'));
        for (const ws of workspaces) {
            await db.query(
                'INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, owner_id = $3',
                [ws.id, ws.name, ws.ownerId]
            );
        }
        console.log(`Migrated ${workspaces.length} workspaces.`);

        // 4. Migrate Tables and Rows
        const tablesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'tables.json'), 'utf8'));
        let rowCount = 0;
        for (const table of tablesData) {
            // In JSON, tables might not have workspaceId if they are orphans or from older versions
            // But we need a valid workspaceId for the foreign key.
            if (!table.workspaceId) {
                console.warn(`Table ${table.name} (${table.id}) has no workspaceId, skipping.`);
                continue;
            }

            // Verify workspace existence before inserting
            const wsCheck = await db.query('SELECT id FROM workspaces WHERE id = $1', [table.workspaceId]);
            if (wsCheck.rowCount === 0) {
                console.warn(`Table ${table.name} (${table.id}) references non-existent workspace ${table.workspaceId}, skipping.`);
                continue;
            }

            await db.query(
                'INSERT INTO tables (id, name, workspace_id, columns, created_at, doc_content) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name = $2, workspace_id = $3, columns = $4, created_at = $5, doc_content = $6',
                [table.id, table.name, table.workspaceId, JSON.stringify(table.columns), table.createdAt || Date.now(), table.docContent || '']
            );

            if (table.tasks && table.tasks.length > 0) {
                for (const task of table.tasks) {
                    await db.query(
                        'INSERT INTO rows (id, table_id, values) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET table_id = $2, values = $3',
                        [task.id, table.id, JSON.stringify(task.values)]
                    );
                    rowCount++;
                }
            }
        }
        console.log(`Migrated ${tablesData.length} tables and ${rowCount} rows.`);

        // 5. Migrate Activity Logs
        const updatesFile = path.join(dataDir, 'email_updates.json');
        if (fs.existsSync(updatesFile)) {
            const updates = JSON.parse(fs.readFileSync(updatesFile, 'utf8'));
            for (const log of updates) {
                await db.query(
                    'INSERT INTO activity_logs (recipients, subject, html, timestamp, table_id, task_id) VALUES ($1, $2, $3, $4, $5, $6)',
                    [JSON.stringify(log.recipients), log.subject, log.html, log.timestamp, log.tableId, log.taskId]
                );
            }
            console.log(`Migrated ${updates.length} activity logs.`);
        }

        // 6. Migrate Automations
        const automationsFile = path.join(dataDir, 'automation.json');
        if (fs.existsSync(automationsFile)) {
            const automations = JSON.parse(fs.readFileSync(automationsFile, 'utf8'));
            for (const auto of automations) {
                await db.query(
                    'INSERT INTO automations (table_id, task_id, trigger_col, enabled, recipients, cols) VALUES ($1, $2, $3, $4, $5, $6)',
                    [auto.tableId, auto.taskId || null, auto.triggerCol, auto.enabled, JSON.stringify(auto.recipients), JSON.stringify(auto.cols)]
                );
            }
            console.log(`Migrated ${automations.length} automations.`);
        }

        // 7. Migrate Chats
        const chatsFile = path.join(dataDir, 'tableChats.json');
        if (fs.existsSync(chatsFile)) {
            const chatsData = JSON.parse(fs.readFileSync(chatsFile, 'utf8'));
            let chatCount = 0;
            for (const tableId in chatsData) {
                for (const msg of chatsData[tableId]) {
                    await db.query(
                        'INSERT INTO table_chats (id, table_id, sender, text, timestamp) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                        [msg.id || uuidv4(), tableId, msg.sender || msg.user, msg.text, msg.timestamp]
                    );
                    chatCount++;
                }
            }
            console.log(`Migrated ${chatCount} chat messages.`);
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        db.pool.end();
    }
}

migrate();

