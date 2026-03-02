// --- Task Order Endpoint for Drag-and-Drop ---
// (Endpoint is now placed at the end of the file, after all initialization)
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');
const authenticateToken = require('./middleware/authenticateToken');
const { sendEmail } = require('./mailer');
const { sendPushNotification } = require('./firebase');


const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://packagereport.onrender.com",
      "http://localhost:3000",
      "http://192.168.0.25:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // ensure websocket is enabled
  pingTimeout: 60000,
  pingInterval: 25000
});

// --- Socket.IO Handlers ---
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  socket.on('join_table', (tableId) => {
    socket.join(tableId);
    console.log(`[Socket] Client ${socket.id} joined table: ${tableId}`);
  });
  
  // Board Chat Typing
  socket.on('typing_board', ({ tableId, user }) => {
    socket.to(tableId).emit('typing_board', { user });
  });

  socket.on('stop_typing_board', ({ tableId, user }) => {
    socket.to(tableId).emit('stop_typing_board', { user });
  });

  // Task Chat (Discussion) Typing
  socket.on('typing_task', ({ tableId, taskId, user }) => {
     socket.to(tableId).emit('typing_task', { taskId, user });
  });

  socket.on('stop_typing_task', ({ tableId, taskId, user }) => {
    socket.to(tableId).emit('stop_typing_task', { taskId, user });
  });
  
  socket.on('join_task', (taskId) => {
      socket.join(taskId);
  });
  
  socket.on('leave_task', (taskId) => {
      socket.leave(taskId);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// --- Database Schema Migrations ---
(async () => {
  try {
    await db.query(`
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS status TEXT;
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
    `);
    await db.query(`ALTER TABLE tables ADD COLUMN IF NOT EXISTS shared_users JSONB DEFAULT '[]'::jsonb;`);
    await db.query(`UPDATE tables SET shared_users = '[]'::jsonb WHERE shared_users IS NULL;`);

    // Migration for granular permissions: convert ['id1', 'id2'] to [{userId: 'id1', permission: 'edit'}, ...]
    await db.query(`
      UPDATE tables 
      SET shared_users = (
        SELECT jsonb_agg(jsonb_build_object('userId', elem, 'permission', 'edit'))
        FROM jsonb_array_elements_text(shared_users) AS elem
      )
      WHERE jsonb_typeof(shared_users) = 'array' 
      AND (jsonb_array_length(shared_users) = 0 OR jsonb_typeof(shared_users->0) = 'string');
    `);

    await db.query(`ALTER TABLE tables ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;`);
    console.log('[DB] Schema checked/updated.');
  } catch (err) {
    console.error('[DB] Schema migration error:', err);
  }
})();

// Enable CORS for all routes before anything else
app.use(cors());

// Enable JSON parsing for request bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  if (req.method === 'POST') {
      const bodyStr = req.body ? JSON.stringify(req.body) : '{}';
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip} body: ${(bodyStr || '{}').substring(0, 100)}`);
  } else {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  }
  next();
});

// Register people and automation routes at /api
const authRoute = require('./routes/auth');
const peopleRoute = require('./routes/people');
const automationRoute = require('./routes/automation');
const emailerRoute = require('./routes/emailer');
// const tableTasksRoute = require('./routes/tableTasks');
app.use('/api', authRoute);
app.use('/api', peopleRoute);
app.use('/api', automationRoute);
app.use('/api', emailerRoute);
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'data/uploads')));
// Serve frontend static export if it exists
const outDir = path.join(__dirname, '../out');
if (fs.existsSync(outDir)) {
  app.use(express.static(outDir));
  // Handle SPA routing: serve index.html for unknown routes if it's a GET request
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(outDir, 'index.html'));
    }
    next();
  });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'data/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// File Upload Endpoint with improved error handling
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, function (err) {
    if (err) {
      console.error('[Upload Error]', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the URL to access the file
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });
  });
});

// Port is handled after route registration
const PORT = process.env.PORT || 4000;

// --- Workspace Endpoints ---

// List all workspaces for the authenticated user
app.get('/api/workspaces', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await db.query(`
      SELECT DISTINCT w.*, u.name as owner_name, u.avatar as owner_avatar
      FROM workspaces w
      JOIN users u ON w.owner_id = u.id
      LEFT JOIN tables t ON w.id = t.workspace_id
      WHERE w.owner_id = $1 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $1)
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching workspaces:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single workspace by ID (if owned by user)
app.get('/api/workspaces/:workspaceId', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await db.query(`
      SELECT DISTINCT w.* 
      FROM workspaces w
      LEFT JOIN tables t ON w.id = t.workspace_id
      WHERE w.id = $1 AND (w.owner_id = $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $2))
    `, [req.params.workspaceId, req.user.id]);
    const workspace = result.rows[0];
    if (!workspace) {
      return res.status(403).json({ error: 'Workspace not found or forbidden' });
    }
    res.json(workspace);
  } catch (err) {
    console.error('Error fetching workspace:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new workspace
app.post('/api/workspaces', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const newWorkspace = {
      id: uuidv4(),
      name: req.body.name || 'Untitled Workspace',
      owner_id: req.user.id
    };

    await db.query('INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)', [newWorkspace.id, newWorkspace.name, newWorkspace.owner_id]);

    const defaultTableId = uuidv4();
    const columns = [
      { id: uuidv4(), name: 'Text', type: 'Text', order: 0 },
      {
        id: uuidv4(), name: 'Status', type: 'Status', order: 1, options: [
          { value: 'Started', color: '#1976d2' },
          { value: 'Working on it', color: '#fdab3d' },
          { value: 'Done', color: '#00c875' }
        ]
      },
      { id: uuidv4(), name: 'Date', type: 'Date', order: 2 }
    ];

    await db.query(
      'INSERT INTO tables (id, name, workspace_id, columns, created_at) VALUES ($1, $2, $3, $4, $5)',
      [defaultTableId, `${newWorkspace.name} Table`, newWorkspace.id, JSON.stringify(columns), Date.now()]
    );

    res.json(newWorkspace);
  } catch (err) {
    console.error('Error creating workspace:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a workspace (rename)
app.put('/api/workspaces/:workspaceId', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Workspace name is required' });
  }

  try {
    // Check ownership
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.params.workspaceId]);
    const workspace = wsResult.rows[0];

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Update name
    const result = await db.query(
      'UPDATE workspaces SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), req.params.workspaceId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating workspace:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Delete a workspace
app.delete('/api/workspaces/:workspaceId', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check ownership first
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.params.workspaceId]);
    const workspace = wsResult.rows[0];

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete workspace (cascading will handle tables and rows if set up in schema)
    await db.query('DELETE FROM workspaces WHERE id = $1', [req.params.workspaceId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting workspace:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List tables for a workspace
app.get('/api/workspaces/:workspaceId/tables', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.params.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    // Allow access if user is owner OR has at least one shared table in this workspace
    const isOwner = workspace.owner_id === req.user.id;
    const sharedTablesCount = await db.query(
      `SELECT COUNT(*) FROM tables WHERE workspace_id = $1 AND EXISTS (SELECT 1 FROM jsonb_array_elements(shared_users) AS elem WHERE elem->>'userId' = $2)`,
      [req.params.workspaceId, req.user.id]
    );
    const hasSharedTables = parseInt(sharedTablesCount.rows[0].count) > 0;

    if (!isOwner && !hasSharedTables) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const tablesResult = await db.query(
      `SELECT * FROM tables WHERE workspace_id = $1 AND ($2 = $3 OR EXISTS (SELECT 1 FROM jsonb_array_elements(shared_users) AS elem WHERE elem->>'userId' = $3))`,
      [req.params.workspaceId, workspace.owner_id, req.user.id]
    );
    res.json(tablesResult.rows);
  } catch (err) {
    console.error('Error fetching workspace tables:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a table for a workspace
app.post('/api/workspaces/:workspaceId/tables', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.params.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let columns = req.body.columns;
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      columns = [
        { id: uuidv4(), name: 'Text', type: 'Text', order: 0 },
        {
          id: uuidv4(), name: 'Status', type: 'Status', order: 1, options: [
            { value: 'Started', color: '#1976d2' },
            { value: 'Working on it', color: '#fdab3d' },
            { value: 'Done', color: '#00c875' }
          ]
        },
        { id: uuidv4(), name: 'Date', type: 'Date', order: 2 }
      ];
    }

    const newTable = {
      id: uuidv4(),
      name: req.body.name,
      workspace_id: req.params.workspaceId,
      columns: columns,
      created_at: Date.now()
    };

    await db.query(
      'INSERT INTO tables (id, name, workspace_id, columns, created_at) VALUES ($1, $2, $3, $4, $5)',
      [newTable.id, newTable.name, newTable.workspace_id, JSON.stringify(newTable.columns), newTable.created_at]
    );

    res.json(newTable);
  } catch (err) {
    console.error('Error creating table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Helper to check table ownership (kept for potential internal use, but mostly replaced by SQL)
function getWorkspaceForTable(workspaces, table) {
  return workspaces.find(w => w.id === table.workspaceId);
}

app.patch('/api/tables/:tableId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    const isOwner = workspace && workspace.owner_id === req.user.id;
    const isShared = table.shared_users && table.shared_users.includes(req.user.id);
    if (!isOwner && !isShared) return res.sendStatus(403);

    if (typeof req.body.name === 'string') {
      await db.query('UPDATE tables SET name = $1 WHERE id = $2', [req.body.name, req.params.tableId]);
      return res.json({ success: true, name: req.body.name });
    }
    res.status(400).json({ error: 'Missing or invalid name' });
  } catch (err) {
    console.error('Error patching table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tables/:tableId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) return res.sendStatus(403);

    await db.query('DELETE FROM tables WHERE id = $1', [req.params.tableId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update table columns
app.put('/api/tables/:tableId/columns', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    const isOwner = workspace && workspace.owner_id === req.user.id;
    const isShared = table.shared_users && Array.isArray(table.shared_users) && table.shared_users.some(u => u.userId === req.user.id);
    if (!isOwner && !isShared) return res.sendStatus(403);

    await db.query('UPDATE tables SET columns = $1 WHERE id = $2', [JSON.stringify(req.body.columns), req.params.tableId]);
    res.json({ success: true, columns: req.body.columns });
  } catch (err) {
    console.error('Error updating columns:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} body:`, req.body);
  next();
});

// List all tables (filter by ownership / workspaceId)
app.get('/api/tables', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    if (req.query.workspaceId) {
      const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.query.workspaceId]);
      const workspace = wsResult.rows[0];
      if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

      const tablesResult = await db.query(`
        SELECT 
            t.*, 
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', r.id, 
                        'table_id', r.table_id, 
                        'values', r.values
                    )
                ) FILTER (WHERE r.id IS NOT NULL), 
                '[]'
            ) as tasks
        FROM tables t 
        LEFT JOIN rows r ON t.id = r.table_id 
        WHERE t.workspace_id = $1 AND ($2 = $3 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $3))
        GROUP BY t.id
      `, [req.query.workspaceId, workspace.owner_id, req.user.id]);
      return res.json(tablesResult.rows);
    } else {
      // Return all tables in all workspaces owned by user, or tables explicitly shared with user
      const result = await db.query(`
        SELECT 
            t.*, 
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', r.id, 
                        'table_id', r.table_id, 
                        'values', r.values
                    )
                ) FILTER (WHERE r.id IS NOT NULL), 
                '[]'
            ) as tasks
        FROM tables t 
        JOIN workspaces w ON t.workspace_id = w.id 
        LEFT JOIN rows r ON t.id = r.table_id 
        WHERE w.owner_id = $1 OR t.shared_users @> $2::jsonb
        GROUP BY t.id
      `, [req.user.id, JSON.stringify([{ userId: req.user.id }])]);
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single table by ID
app.get('/api/tables/:tableId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, w.owner_id as workspace_owner_id, w.name as workspace_name
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1 AND (w.owner_id = $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $2))
    `, [req.params.tableId, req.user.id]);

    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found or forbidden' });
    res.json(table);
  } catch (err) {
    console.error('Error fetching table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a table (must provide workspaceId)
app.post('/api/tables', authenticateToken, async (req, res) => {
  if (!req.body.workspaceId) {
    return res.status(400).json({ error: 'workspaceId is required' });
  }

  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.body.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) return res.sendStatus(403);

    let columns = req.body.columns;
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      columns = [
        { id: uuidv4(), name: 'Text', type: 'Text', order: 0 },
        {
          id: uuidv4(), name: 'Status', type: 'Status', order: 1, options: [
            { value: 'Started', color: '#1976d2' },
            { value: 'Working on it', color: '#fdab3d' },
            { value: 'Done', color: '#00c875' }
          ]
        },
        { id: uuidv4(), name: 'Date', type: 'Date', order: 2 }
      ];
    }

    // Country logic... (keeping it for compatibility)
    const fullCountryList = ["Afghanistan", "Albania", "Algeria" /* ... potentially truncated in snippet ... */]; // I'll skip the full list in the snippet if I can't see the end of it earlier, or just keep the logic

    const newTable = {
      id: uuidv4(),
      name: req.body.name,
      workspace_id: req.body.workspaceId,
      columns: columns,
      created_at: Date.now()
    };

    await db.query(
      'INSERT INTO tables (id, name, workspace_id, columns, created_at) VALUES ($1, $2, $3, $4, $5)',
      [newTable.id, newTable.name, newTable.workspace_id, JSON.stringify(newTable.columns), newTable.created_at]
    );

    res.json(newTable);
  } catch (err) {
    console.error('Error creating table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Share a table with another user
app.post('/api/tables/:tableId/share', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { userId, permission } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  const perm = permission === 'read' ? 'read' : 'edit';

  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only workspace owners can share tables' });
    }

    const sharedUsers = table.shared_users || [];
    const existingIndex = sharedUsers.findIndex(u => u.userId === userId);
    if (existingIndex !== -1) {
      // User already shared: just update permission
      sharedUsers[existingIndex].permission = perm;
      await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), req.params.tableId]);
      return res.json({ success: true, shared_users: sharedUsers, message: 'Permission updated' });
    } else {
      // User not shared: Send Invite Notification
      const notifId = uuidv4();
      await db.query(
        'INSERT INTO notifications (id, recipient_id, sender_id, type, data) VALUES ($1, $2, $3, $4, $5)',
        [notifId, userId, req.user.id, 'invite', JSON.stringify({ tableId: table.id, tableName: table.name, permission: perm })]
      );

      // Send Push Notification
      const userRes = await db.query('SELECT fcm_token FROM users WHERE id = $1', [userId]);
      const token = userRes.rows[0]?.fcm_token;
      if (token) {
         await sendPushNotification(
            [token],
            'Table Invite',
            `${req.user.name} requests you to share this table: ${table.name}`,
            { type: 'invite', notificationId: notifId, tableId: table.id }
         );
      }
      
      return res.json({ success: true, message: 'Invite sent to user' });
    }
  } catch (err) {
    console.error('Error sharing table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users shared with a table
app.get('/api/tables/:tableId/shared-users', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only owners can manage shared users' });
    }

    const shared = table.shared_users || [];
    if (shared.length === 0) return res.json([]);

    const userIds = shared.map(u => u.userId);
    const usersResult = await db.query('SELECT id, name, email, avatar FROM users WHERE id = ANY($1)', [userIds]);

    const usersWithPerms = usersResult.rows.map(user => {
      const shareInfo = shared.find(s => s.userId === user.id);
      return { ...user, permission: shareInfo ? shareInfo.permission : 'read' };
    });

    res.json(usersWithPerms);
  } catch (err) {
    console.error('Error fetching shared users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a user from a shared table
app.delete('/api/tables/:tableId/share/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only owners can remove shared users' });
    }

    const sharedUsers = table.shared_users || [];
    const filtered = sharedUsers.filter(u => u.userId !== req.params.userId);

    await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(filtered), req.params.tableId]);
    res.json({ success: true, shared_users: filtered });
  } catch (err) {
    console.error('Error removing shared user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get or Generate invite code for a table
app.post('/api/tables/:tableId/invite-code', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only workspace owners can manage invite codes' });
    }

    let inviteCode = table.invite_code;
    if (!inviteCode) {
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.query('UPDATE tables SET invite_code = $1 WHERE id = $2', [inviteCode, req.params.tableId]);
    }

    res.json({ invite_code: inviteCode });
  } catch (err) {
    console.error('Error managing invite code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete invite code (Stop sharing via code)
app.delete('/api/tables/:tableId/invite-code', authenticateToken, async (req, res) => {
  try {
    const tableId = req.params.tableId;
    // Verify ownership
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });
    
    // Check workspace owner
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only workspace owners can stop sharing' });
    }

    await db.query('UPDATE tables SET invite_code = NULL, shared_users = \'[]\'::jsonb WHERE id = $1', [tableId]);
    res.json({ success: true, message: 'Sharing stopped and shared users removed' });
  } catch (err) {
    console.error('Error deleting invite code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a table using an invite code
app.post('/api/tables/join', authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: 'Invite code is required' });

    console.log(`[Join] User ${req.user.id} trying to join with code ${inviteCode}`);
    const result = await db.query('SELECT * FROM tables WHERE UPPER(invite_code) = $1', [inviteCode.toUpperCase()]);
    const table = result.rows[0];
    if (!table) {
      console.log(`[Join] Invalid invite code: ${inviteCode}`);
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    let sharedUsers = table.shared_users;
    if (!sharedUsers || !Array.isArray(sharedUsers)) {
      sharedUsers = [];
    }

    if (!sharedUsers.some(u => u.userId === req.user.id)) {
      sharedUsers.push({ userId: req.user.id, permission: 'edit' });
      await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), table.id]);
      console.log(`[Join] User ${req.user.id} successfully added to table ${table.id}`);
    } else {
      console.log(`[Join] User ${req.user.id} already in shared_users for table ${table.id}`);
    }

    res.json({ success: true, tableId: table.id, workspaceId: table.workspace_id });
  } catch (err) {
    console.error('Error joining table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Per-table tasks endpoints

// Get all tasks for a table
app.get('/api/tables/:tableId/tasks', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM rows WHERE table_id = $1 ORDER BY (values->>'order')::integer ASC NULLS LAST, id ASC",
      [req.params.tableId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific task by ID for a table
app.get('/api/tables/:tableId/tasks/:taskId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rows WHERE id = $1 AND table_id = $2', [req.params.taskId, req.params.tableId]);
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(row);
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tables/:tableId/tasks', async (req, res) => {
  try {
    const newTask = { id: uuidv4(), table_id: req.params.tableId, values: req.body.values || {} };
    await db.query(
      'INSERT INTO rows (id, table_id, values) VALUES ($1, $2, $3)',
      [newTask.id, newTask.table_id, JSON.stringify(newTask.values)]
    );
    console.log(`Task created for table ${req.params.tableId}:`, newTask);
    res.status(201).json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update document content
app.put('/api/tables/:tableId/doc', async (req, res) => {
  try {
    await db.query('UPDATE tables SET doc_content = $1 WHERE id = $2', [req.body.content, req.params.tableId]);
    res.json({ success: true, content: req.body.content });
  } catch (err) {
    console.error('Error updating document content:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tables/:tableId/tasks', authenticateToken, async (req, res) => {
  const debugLogs = [];
  const log = (msg, obj) => {
    console.log(msg, obj);
    debugLogs.push({ msg, obj });
  };

  try {
    const { id, values } = req.body;
    if (!id || typeof values !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // 1. Get existing task and table
    const tableResult = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = tableResult.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const rowResult = await db.query('SELECT * FROM rows WHERE id = $1 AND table_id = $2', [id, req.params.tableId]);
    const row = rowResult.rows[0];
    if (!row) return res.status(404).json({ error: 'Task not found' });

    const oldValues = row.values || {};
    const newValues = values || {};
    const timestamp = new Date().toISOString();
    const newActivity = [];
    const oldActivity = oldValues.activity || [];

    // --- Notification Logic ---
    const sendNotification = async (title, body, type, data) => {
        try {
            // Get recipients (workspace owner + shared users)
            const workspaceRes = await db.query('SELECT owner_id FROM workspaces WHERE id = $1', [table.workspace_id]);
            let recipientIds = new Set();
            if (workspaceRes.rows.length > 0) recipientIds.add(workspaceRes.rows[0].owner_id);
            
            if (Array.isArray(table.shared_users)) {
                table.shared_users.forEach(u => {
                    if (typeof u === 'string') recipientIds.add(u);
                    else if (u.userId) recipientIds.add(u.userId);
                });
            }

            // Remove sender
            if (req.user && req.user.id) recipientIds.delete(req.user.id);
            
            if (recipientIds.size > 0) {
                const recipientsArray = Array.from(recipientIds);
                const tokensRes = await db.query('SELECT fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL', [recipientsArray]);
                const tokens = tokensRes.rows.map(r => r.fcm_token);
                if (tokens.length > 0) {
                    await sendPushNotification(tokens, title, body, {
                        type: type || 'chat_message',
                        tableId: table.id,
                        taskId: id,
                        ...data
                    });
                }
            }
        } catch (e) {
            console.error('[Notification] Failed to send:', e);
        }
    };

    // Detect Task Chat (Discussion)
    if (newValues.message && Array.isArray(newValues.message)) {
        const oldLen = (oldValues.message && Array.isArray(oldValues.message)) ? oldValues.message.length : 0;
        if (newValues.message.length > oldLen) {
            const lastMsg = newValues.message[newValues.message.length - 1];
            // Find task name (assume 'task' column or first text column)
            // Use user-defined task column name if possible, fallback to 'task'
            let taskName = 'Task';
            if (table.columns && Array.isArray(table.columns)) {
                const taskCol = table.columns.find(c => c.id === 'task') || table.columns[0];
                if (taskCol && newValues[taskCol.id]) {
                    taskName = newValues[taskCol.id];
                }
            } else if (newValues['task']) {
                taskName = newValues['task'];
            }
            
            const userName = lastMsg.sender || (req.user ? req.user.name : 'User');
            
            // Format: "{Users Name} commented on the {Tasks name}: (The message)"
            await sendNotification(
                'New Discussion', 
                `${userName} commented on the ${taskName}: ${lastMsg.text}`,
                'task_chat'
            );
        }
    }

    // Detect File Comments
    const columns = table.columns || [];
    if (Array.isArray(columns)) {
        for (const col of columns) {
            if (col.type === 'Files') {
                const oldFiles = oldValues && oldValues[col.id] && Array.isArray(oldValues[col.id]) ? oldValues[col.id] : [];
                const newFiles = newValues && newValues[col.id] && Array.isArray(newValues[col.id]) ? newValues[col.id] : [];
                
                for (const nFile of newFiles) {
                    const oFile = oldFiles.find(o => o.url === nFile.url); // Match by URL
                    if (oFile && nFile.comments && Array.isArray(nFile.comments)) {
                        const oldCommentsLen = (oFile.comments && Array.isArray(oFile.comments)) ? oFile.comments.length : 0;
                        if (nFile.comments.length > oldCommentsLen) {
                            const lastComment = nFile.comments[nFile.comments.length - 1];
                            const userName = lastComment.user || (req.user ? req.user.name : 'User');
                            const fileName = nFile.name || 'File';
                            
                            // Format: "{Users Name} commented on the {file name}: (The Comment)"
                            await sendNotification(
                                'New File Comment',
                                `${userName} commented on the ${fileName}: ${lastComment.text}`,
                                'file_comment'
                            );
                        }
                    }
                }
            }
        }
    }
    // --- End Notification Logic ---

    // 2. Detect changes for activity logging
    Object.keys(newValues).forEach(key => {
      if (key === 'message' || key === 'activity') return;

      const oldVal = oldValues[key];
      const newVal = newValues[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        const columns = table.columns || [];
        const col = columns.find(c => c.id === key);
        const colName = col ? col.name : key;

        let logText = `Updated ${colName}`;
        if (newVal !== null && typeof newVal !== 'object') {
          logText += ` to "${newVal}"`;
        }

        newActivity.push({ text: logText, time: timestamp, user: "User" });
      }
    });

    // 3. Update task in database
    const mergedValues = { ...oldValues, ...newValues };
    if (newActivity.length > 0) {
      mergedValues.activity = [...newActivity, ...oldActivity];
    } else {
      mergedValues.activity = oldActivity;
    }

    await db.query('UPDATE rows SET values = $1 WHERE id = $2', [JSON.stringify(mergedValues), id]);

    // 4. Automation Logic
    // Prioritize task-specific automation over table-level
    const autoResult = await db.query(
      'SELECT * FROM automations WHERE (task_id = $1 OR (table_id = $2 AND task_id IS NULL)) AND enabled = true ORDER BY task_id DESC NULLS LAST',
      [id, req.params.tableId]
    );
    const automation = autoResult.rows[0];
    console.log('[AUTOMATION] Found automations:', autoResult.rows.length);

    if (automation && automation.trigger_col) {
      const triggerCol = automation.trigger_col;
      console.log(`[AUTOMATION] Checking trigger "${triggerCol}":`, {
        old: oldValues[triggerCol],
        new: newValues[triggerCol]
      });
      if (oldValues[triggerCol] !== newValues[triggerCol]) {
        // Trigger automation...
        const subject = `Task updated: ${table.name}`;

        let htmlRows = '';
        const columns = table.columns || [];
        const automationCols = automation.cols || [];

        automationCols.forEach(colId => {
          const col = columns.find(c => c.id === colId);
          if (col) {
            let val = newValues[colId];
            if (typeof val === 'object' && val !== null) {
              val = JSON.stringify(val);
            }
            htmlRows += `
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px; font-weight: 500; width: 40%; vertical-align: top;">${col.name}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600; vertical-align: top;">${val}</td>
              </tr>
            `;
          }
        });

        const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; background-color: #f3f4f6; color: #111827;">
  <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">Smart Manage</h1>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="margin-top: 0; color: #1f2937; font-size: 22px; font-weight: 600; margin-bottom: 16px;">Task Updated</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
        An update occurred in the <strong style="color: #2563eb;">${table.name}</strong> table. The recorded changes are listed below:
      </p>
      
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; background-color: #fafafa;">
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
      </div>
      
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
          This is an automated notification from your <strong>Smart Manage</strong> workspace.
        </p>
      </div>
    </div>
  </div>
</div>
        `;

        const recipients = automation.recipients;
        if (recipients && recipients.length > 0) {
          // 1. Log to PostgreSQL activity_logs (initial)
          console.log('[AUTOMATION] Triggering email for recipients:', recipients);
          const logRes = await db.query(
            'INSERT INTO activity_logs (recipients, subject, html, timestamp, table_id, task_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [JSON.stringify(recipients), subject, html, Date.now(), table.id, id, 'pending']
          );
          const logId = logRes.rows[0].id;

          // 2. Actually send the email (in background)
          (async () => {
            try {
              await sendEmail({
                to: recipients,
                subject,
                html
              });
              await db.query('UPDATE activity_logs SET status = $1 WHERE id = $2', ['sent', logId]);
            } catch (mailErr) {
              console.error('[AUTOMATION] Failed to send email to recipients:', recipients, 'Error:', mailErr);
              const detailedError = mailErr.stack || mailErr.message || String(mailErr);
              await db.query('UPDATE activity_logs SET status = $1, error_message = $2 WHERE id = $3', ['error', detailedError, logId]);
            }
          })();
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tables/:tableId/tasks/:taskId', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM rows WHERE id = $1 AND table_id = $2', [req.params.taskId, req.params.tableId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get recent email updates (Activity Feed)
app.get('/api/email-updates', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    // 1. Get workspaces owned by this user
    const wsResult = await db.query('SELECT id FROM workspaces WHERE owner_id = $1', [req.user.id]);
    const userWorkspaceIds = wsResult.rows.map(ws => ws.id);
    console.log(`[ACTIVITY] User ${req.user.id} has workspaces:`, userWorkspaceIds);

    if (userWorkspaceIds.length === 0) return res.json([]);

    // 2. Get tables belonging to those workspaces
    const tablesResult = await db.query('SELECT id FROM tables WHERE workspace_id = ANY($1)', [userWorkspaceIds]);
    const userTableIds = tablesResult.rows.map(t => t.id);
    console.log(`[ACTIVITY] User ${req.user.id} has tables:`, userTableIds);

    if (userTableIds.length === 0) return res.json([]);

    // 3. Filter activity logs by those table IDs
    const logsResult = await db.query(
      'SELECT * FROM activity_logs WHERE table_id = ANY($1) ORDER BY timestamp DESC LIMIT 20',
      [userTableIds]
    );
    // Map snake_case to camelCase for frontend consistency
    const mappedLogs = logsResult.rows.map(log => ({
      id: log.id,
      recipients: log.recipients,
      subject: log.subject,
      html: log.html,
      timestamp: log.timestamp,
      tableId: log.table_id,
      taskId: log.task_id,
      status: log.status,
      errorMessage: log.error_message
    }));
    res.json(mappedLogs);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- Task Order Endpoint for Drag-and-Drop ---
app.put('/api/tables/:tableId/tasks/order', async (req, res) => {
  const { orderedTaskIds } = req.body;
  if (!Array.isArray(orderedTaskIds)) {
    return res.status(400).json({ error: 'orderedTaskIds must be array' });
  }

  try {
    // In PostgreSQL, we'll store order as a property in the values JSONB or as a separate column.
    // Given the current schema, let's update the 'values' JSONB to include 'order'.
    for (let i = 0; i < orderedTaskIds.length; i++) {
      const taskId = orderedTaskIds[i];
      // We need to merge the new order into existing values
      await db.query(`
            UPDATE rows 
            SET values = jsonb_set(COALESCE(values, '{}'::jsonb), '{order}', $1::jsonb)
            WHERE id = $2 AND table_id = $3
        `, [JSON.stringify(i), taskId, req.params.tableId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error ordering tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- User FCM Token Endpoint ---
app.put('/api/users/fcm', authenticateToken, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });
  try {
    await db.query('UPDATE users SET fcm_token = $1 WHERE id = $2', [token, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating FCM token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/fcm', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE users SET fcm_token = NULL WHERE id = $1', [req.user.id]);
    console.log(`[FCM] Cleared token for user ${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing FCM token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Test Notification Endpoint ---
app.post('/api/test-notification', authenticateToken, async (req, res) => {
    try {
        const userRes = await db.query('SELECT fcm_token FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0 || !userRes.rows[0].fcm_token) {
            return res.status(400).json({ error: 'No FCM token found for user' });
        }
        
        const token = userRes.rows[0].fcm_token;
        console.log(`Sending test notification to user ${req.user.id} with token ${token.substring(0, 10)}...`);
        
        await sendPushNotification([token], 'Test Notification', 'This is a test from SmartManage!');
        res.json({ success: true, message: 'Notification sent' });
    } catch (err) {
        console.error('Error sending test notification:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Table Chat Endpoints ---
// Using a table in PostgreSQL for chats
app.get('/api/tables/:tableId/chat', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM table_chats WHERE table_id = $1 ORDER BY timestamp ASC', [req.params.tableId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- Notification Routes ---

// Get unread notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM notifications WHERE recipient_id = $1 AND read = false ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept Invite
app.post('/api/notifications/:id/accept', authenticateToken, async (req, res) => {
  try {
    const notifResult = await db.query('SELECT * FROM notifications WHERE id = $1 AND recipient_id = $2', [req.params.id, req.user.id]);
    const notification = notifResult.rows[0];
    
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.type !== 'invite') return res.status(400).json({ error: 'Not an invite' });

    const { tableId, permission } = notification.data || {};
    
    if (!tableId) return res.status(400).json({ error: 'Invalid invite data' });

    // Add user to table
    const tableResult = await db.query('SELECT * FROM tables WHERE id = $1', [tableId]);
    const table = tableResult.rows[0];

    if (table) {
      let sharedUsers = table.shared_users;
      if (!Array.isArray(sharedUsers)) sharedUsers = [];
      
      // Check if already shared
      if (!sharedUsers.some(u => u.userId === req.user.id)) {
        sharedUsers.push({ userId: req.user.id, permission: permission || 'edit' });
        await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), tableId]);
      }
    }

    // Mark as read
    await db.query('UPDATE notifications SET read = true WHERE id = $1', [req.params.id]);

    res.json({ success: true, message: 'Invite accepted' });
  } catch (err) {
    console.error('Error accepting invite:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline Invite (Mark as read)
app.post('/api/notifications/:id/decline', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET read = true WHERE id = $1 AND recipient_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Invite declined' });
  } catch (err) {
    console.error('Error declining invite:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper for invite notifications
const createInviteNotification = async (recipientId, senderId, tableId, tableName, permission) => {
    const notifDisplayId = uuidv4();
    await db.query(
        'INSERT INTO notifications (id, recipient_id, sender_id, type, data) VALUES ($1, $2, $3, $4, $5)',
        [notifDisplayId, recipientId, senderId, 'invite', JSON.stringify({ tableId, tableName, permission })]
    );
    
    // Also send Push Notification
    const userRes = await db.query('SELECT fcm_token FROM users WHERE id = $1', [recipientId]);
    const token = userRes.rows[0]?.fcm_token;
    if (token) {
        // Fetch sender name
        const senderRes = await db.query('SELECT name FROM users WHERE id = $1', [senderId]);
        const senderName = senderRes.rows[0]?.name || 'Someone';
        
        await sendPushNotification(
            [token],
            'Table Invite',
            `${senderName} requests you to share this table: ${tableName}`,
            { type: 'invite', notificationId: notifDisplayId }
        );
    }
};

app.post('/api/tables/:tableId/chat', authenticateToken, async (req, res) => {
  try {
    const newMessage = {
      id: uuidv4(),
      table_id: req.params.tableId,
      sender: req.body.sender || req.user.name, // Fallback to auth user name if not provided
      text: req.body.text,
      timestamp: req.body.timestamp || Date.now(),
      attachment: req.body.attachment || null // Add attachment support
    };

    await db.query(
      'INSERT INTO table_chats (id, table_id, sender, text, timestamp, attachment) VALUES ($1, $2, $3, $4, $5, $6)',
      [newMessage.id, newMessage.table_id, newMessage.sender, newMessage.text, newMessage.timestamp, newMessage.attachment]
    );

    // Send push notification to other users
    // 1. Get the table name and workspace/shared users
    const tableRes = await db.query('SELECT name, workspace_id, shared_users FROM tables WHERE id = $1', [newMessage.table_id]);
    if (tableRes.rows.length > 0) {
      const table = tableRes.rows[0];
      const tableName = table.name;
      
      // 2. Determine recipients
      // Start with workspace owner
      const workspaceRes = await db.query('SELECT owner_id FROM workspaces WHERE id = $1', [table.workspace_id]);
      let recipientIds = new Set();
      
      if (workspaceRes.rows.length > 0) {
        recipientIds.add(workspaceRes.rows[0].owner_id);
      }

      // Add shared users
      if (Array.isArray(table.shared_users)) {
        table.shared_users.forEach(u => {
          if (typeof u === 'string') recipientIds.add(u);
          else if (u.userId) recipientIds.add(u.userId);
        });
      }

      // Remove sender (so you don't receive notifications for your own messages)
      recipientIds.delete(req.user.id);
      
      // console.log(`[Chat Notification] Sender: ${req.user.id}, Potential Recipients: ${Array.from(recipientIds).join(', ')}`);

      if (recipientIds.size > 0) {
        const recipientsArray = Array.from(recipientIds);
        // Get FCM tokens for these users
        const tokensRes = await db.query('SELECT id, fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL', [recipientsArray]);
        
        const tokens = tokensRes.rows.map(r => r.fcm_token);
        console.log(`[Chat Notification] Found ${tokens.length} tokens for users: ${tokensRes.rows.map(r => r.id).join(', ')}`);

        if (tokens.length > 0) {
          await sendPushNotification(tokens, `New message in ${tableName}`, `${newMessage.sender}: ${newMessage.text}`, {
              type: 'chat_message',
              tableId: newMessage.table_id,
              senderId: req.user.id
          });
        }
      }
    }

    res.json(newMessage);
  } catch (err) {
    console.error('Error posting chat message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
    try {
        console.log(`Express server running on http://0.0.0.0:${PORT}`);
        console.log(`Socket.IO listening on port ${PORT}`);
    } catch (err) {
        console.error('Error starting server/socket:', err);
    }
});
