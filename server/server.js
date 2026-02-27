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


const app = express();
// Enable CORS for all routes before anything else
app.use(cors());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Register people and automation routes at /api

app.use(express.json());
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

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Return the URL to access the file
  // Assuming the server is running on the same host/port relative to client or proxied
  // If absolute URL is needed, construct it: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size
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
    const result = await db.query('SELECT * FROM workspaces WHERE owner_id = $1', [req.user.id]);
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
    const result = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.params.workspaceId]);
    const workspace = result.rows[0];
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    if (workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
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
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const tablesResult = await db.query('SELECT * FROM tables WHERE workspace_id = $1', [req.params.workspaceId]);
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
    if (!workspace || workspace.owner_id !== req.user.id) return res.sendStatus(403);

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
    if (!workspace || workspace.owner_id !== req.user.id) return res.sendStatus(403);

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
      if (!workspace || workspace.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      const tablesResult = await db.query('SELECT * FROM tables WHERE workspace_id = $1', [req.query.workspaceId]);
      return res.json(tablesResult.rows);
    } else {
      // Return all tables in all workspaces owned by user
      const result = await db.query(
        'SELECT t.* FROM tables t JOIN workspaces w ON t.workspace_id = w.id WHERE w.owner_id = $1',
        [req.user.id]
      );
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Error fetching tables:', err);
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

app.put('/api/tables/:tableId/tasks', async (req, res) => {
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
        let html = `<h2>Task Update</h2><ul>`;
        const columns = table.columns || [];
        const automationCols = automation.cols || [];

        automationCols.forEach(colId => {
          const col = columns.find(c => c.id === colId);
          if (col) html += `<li><b>${col.name}:</b> ${JSON.stringify(newValues[colId])}</li>`;
        });
        html += `</ul>`;

        const recipients = automation.recipients;
        if (recipients && recipients.length > 0) {
          // 1. Log to PostgreSQL activity_logs (initial)
          const logRes = await db.query(
            'INSERT INTO activity_logs (recipients, subject, html, timestamp, table_id, task_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [JSON.stringify(recipients), subject, html, Date.now(), table.id, id, 'pending']
          );
          const logId = logRes.rows[0].id;

          // 2. Actually send the email
          try {
            await sendEmail({
              to: recipients,
              subject,
              html
            });
            await db.query('UPDATE activity_logs SET status = $1 WHERE id = $2', ['sent', logId]);
          } catch (mailErr) {
            console.error('[AUTOMATION] Failed to send email:', mailErr);
            await db.query('UPDATE activity_logs SET status = $1, error_message = $2 WHERE id = $3', ['error', mailErr.message, logId]);
          }
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

    if (userWorkspaceIds.length === 0) return res.json([]);

    // 2. Get tables belonging to those workspaces
    const tablesResult = await db.query('SELECT id FROM tables WHERE workspace_id = ANY($1)', [userWorkspaceIds]);
    const userTableIds = tablesResult.rows.map(t => t.id);

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

app.post('/api/tables/:tableId/chat', async (req, res) => {
  try {
    const newMessage = {
      id: uuidv4(),
      table_id: req.params.tableId,
      sender: req.body.sender,
      text: req.body.text,
      timestamp: req.body.timestamp || Date.now()
    };

    await db.query(
      'INSERT INTO table_chats (id, table_id, sender, text, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [newMessage.id, newMessage.table_id, newMessage.sender, newMessage.text, newMessage.timestamp]
    );

    res.json(newMessage);
  } catch (err) {
    console.error('Error posting chat message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express server running on http://0.0.0.0:${PORT}`);
});
