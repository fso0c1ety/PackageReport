const db = require('./server/db');
const { v4: uuidv4 } = require('uuid');

async function testJoin() {
    const testTableId = uuidv4();
    const testInviteCode = 'TEST02';

    try {
        // 1. Get an existing user
        const userRes = await db.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) {
            console.log('No users found. Please register a user first.');
            process.exit();
        }
        const testUserId = userRes.rows[0].id;
        console.log('Using test user:', testUserId);

        // 1. Create a test workspace
        const wsId = uuidv4();
        await db.query('INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)', [wsId, 'Test Join WS', testUserId]);

        // 2. Create a test table with an invite code
        await db.query(
            "INSERT INTO tables (id, name, workspace_id, invite_code, columns, shared_users) VALUES ($1, $2, $3, $4, $5, '[]'::jsonb)",
            [testTableId, 'Test Join Table', wsId, testInviteCode, '[]']
        );
        console.log('Created test table with invite code:', testInviteCode);

        // 3. Simulate join
        const result = await db.query('SELECT * FROM tables WHERE invite_code = $1', [testInviteCode]);
        const table = result.rows[0];
        if (!table) throw new Error('Table not found');

        const sharedUsers = table.shared_users || [];
        console.log('Initial shared_users:', sharedUsers);

        if (!sharedUsers.includes(testUserId)) {
            sharedUsers.push(testUserId);
            await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), table.id]);
        }

        const updatedResult = await db.query('SELECT * FROM tables WHERE id = $1', [testTableId]);
        console.log('Updated shared_users:', updatedResult.rows[0].shared_users);

        if (updatedResult.rows[0].shared_users.includes(testUserId)) {
            console.log('SUCCESS: User added to shared_users');
        } else {
            console.log('FAILURE: User not found in shared_users');
        }

        // 4. Test workspace retrieval
        const wsFetch = await db.query(`
      SELECT DISTINCT w.* 
      FROM workspaces w
      LEFT JOIN tables t ON w.id = t.workspace_id
      WHERE w.owner_id = $1 OR t.shared_users @> $2::jsonb
    `, [testUserId, JSON.stringify([testUserId])]);

        if (wsFetch.rows.length > 0) {
            console.log('SUCCESS: Workspace correctly retrieved for shared user');
        } else {
            console.log('FAILURE: Workspace not retrieved for shared user');
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        // Cleanup
        await db.query('DELETE FROM tables WHERE id = $1', [testTableId]);
        process.exit();
    }
}

testJoin();
