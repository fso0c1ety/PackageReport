const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
// Enable CORS for all routes before anything else
app.use(cors());
// Register people and automation routes at /api

app.use(express.json());
const peopleRoute = require('./routes/people');
const automationRoute = require('./routes/automation');
const emailerRoute = require('./routes/emailer');
app.use('/api', peopleRoute);
app.use('/api', automationRoute);
app.use('/api', emailerRoute);
const PORT = 4000;

const dataDir = path.join(__dirname, 'data');
const workspacesFile = path.join(dataDir, 'workspaces.json');
const tablesFile = path.join(dataDir, 'tables.json');
const tasksFile = path.join(dataDir, 'tasks.json');
// --- Workspace Endpoints ---
// List all workspaces
app.get('/api/workspaces', (req, res) => {
  res.json(readJson(workspacesFile));
});

// Create a new workspace
app.post('/api/workspaces', (req, res) => {
  const workspaces = readJson(workspacesFile);
  const newWorkspace = {
    id: uuidv4(),
    name: req.body.name || 'Untitled Workspace'
  };
  workspaces.push(newWorkspace);
  writeJson(workspacesFile, workspaces);
  res.json(newWorkspace);
});


// Delete a workspace
app.delete('/api/workspaces/:workspaceId', (req, res) => {
  const workspaces = readJson(workspacesFile);
  const idx = workspaces.findIndex(w => w.id === req.params.workspaceId);
  if (idx === -1) return res.status(404).json({ error: 'Workspace not found' });
  workspaces.splice(idx, 1);
  writeJson(workspacesFile, workspaces);
  // Optionally, delete all tables belonging to this workspace
  let tables = readJson(tablesFile);
  tables = tables.filter(t => t.workspaceId !== req.params.workspaceId);
  writeJson(tablesFile, tables);
  res.json({ success: true });
});

// List tables for a workspace
app.get('/api/workspaces/:workspaceId/tables', (req, res) => {
  const tables = readJson(tablesFile);
  const filtered = tables.filter(t => t.workspaceId === req.params.workspaceId);
  res.json(filtered);
});

// Create a table for a workspace
app.post('/api/workspaces/:workspaceId/tables', (req, res) => {
  const tables = readJson(tablesFile);
  let columns = req.body.columns;
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    columns = [{
      id: uuidv4(),
      name: 'Task',
      type: 'Text',
      order: 0
    }];
  }
  const newTable = {
    id: uuidv4(),
    name: req.body.name,
    columns,
    createdAt: Date.now(),
    tasks: [],
    workspaceId: req.params.workspaceId
  };
  tables.push(newTable);
  writeJson(tablesFile, tables);
  res.json(newTable);
});



function readJson(file) {
  try {
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    console.log(`Read from ${file}:`, data);
    return data;
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
}
function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Wrote to ${file}:`, data);
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
}
app.patch('/api/tables/:tableId', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  if (typeof req.body.name === 'string') {
    table.name = req.body.name;
    writeJson(tablesFile, tables);
    return res.json({ success: true, name: table.name });
  }
  res.status(400).json({ error: 'Missing or invalid name' });
});
app.delete('/api/tables/:tableId', (req, res) => {
  const tables = readJson(tablesFile);
  const idx = tables.findIndex(t => t.id === req.params.tableId);
  if (idx === -1) return res.status(404).json({ error: 'Table not found' });
  tables.splice(idx, 1);
  writeJson(tablesFile, tables);
  res.json({ success: true });
});
// Update table columns
app.put('/api/tables/:tableId/columns', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  table.columns = req.body.columns;
  writeJson(tablesFile, tables);
  res.json({ success: true, columns: table.columns });
});

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} body:`, req.body);
  next();
});

// Tables endpoints
// List all tables (optionally filter by workspaceId)
app.get('/api/tables', (req, res) => {
  const tables = readJson(tablesFile);
  if (req.query.workspaceId) {
    return res.json(tables.filter(t => t.workspaceId === req.query.workspaceId));
  }
  res.json(tables);
});

// Create a table (must provide workspaceId)
app.post('/api/tables', (req, res) => {
  const tables = readJson(tablesFile);
  let columns = req.body.columns;
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    columns = [{
      id: uuidv4(),
      name: 'Task',
      type: 'Text',
      order: 0
    }];
  }
  if (!req.body.workspaceId) {
    return res.status(400).json({ error: 'workspaceId is required' });
  }
  const newTable = {
    id: uuidv4(),
    name: req.body.name,
    columns,
    createdAt: Date.now(),
    tasks: [],
    workspaceId: req.body.workspaceId
  };
  tables.push(newTable);
  writeJson(tablesFile, tables);
  res.json(newTable);
});


// Per-table tasks endpoints
app.get('/api/tables/:tableId/tasks', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  res.json(table && table.tasks ? table.tasks : []);
});

app.post('/api/tables/:tableId/tasks', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  if (!table.tasks) table.tasks = [];
  const newTask = { id: uuidv4(), values: req.body.values || {} };
  table.tasks.push(newTask);
  writeJson(tablesFile, tables);
  console.log(`Task created for table ${req.params.tableId}:`, newTask);
  res.status(201).json(newTask);
});

app.put('/api/tables/:tableId/tasks', async (req, res) => {
  try {
    const tables = readJson(tablesFile);
    const table = tables.find(t => t.id === req.params.tableId);
    if (!table || !table.tasks) {
      console.error('Table not found or missing tasks:', req.params.tableId);
      return res.status(404).json({ error: 'Table not found' });
    }
    const { id, values } = req.body;
    if (!id || typeof values !== 'object') {
      console.error('Invalid request body for task update:', req.body);
      return res.status(400).json({ error: 'Invalid request body' });
    }
    let found = false;
    let oldTask = null;
    table.tasks = table.tasks.map(task => {
      if (task.id === id) {
        found = true;
        oldTask = { ...task };
        return { ...task, values };
      }
      return task;
    });
    if (!found) {
      console.error('Task not found for update:', id);
      return res.status(404).json({ error: 'Task not found' });
    }
    writeJson(tablesFile, tables);
    // Re-read file to confirm write
    const afterWrite = readJson(tablesFile);
    const updatedTable = afterWrite.find(t => t.id === req.params.tableId);
    const updatedTask = updatedTable && updatedTable.tasks ? updatedTable.tasks.find(task => task.id === id) : null;
    if (!updatedTask || JSON.stringify(updatedTask.values) !== JSON.stringify(values)) {
      console.error('Persistence error: Task values after write do not match expected.', { expected: values, actual: updatedTask ? updatedTask.values : null });
      return res.status(500).json({ error: 'Persistence error: Task not updated correctly.' });
    }

    // --- EMAIL AUTOMATION LOGIC ---
    // Load automation config for this table
    const automationFile = path.join(dataDir, 'automation.json');
    let automations = [];
    try { automations = JSON.parse(fs.readFileSync(automationFile, 'utf-8')); } catch {}
    const automation = automations.find(a => a.tableId === req.params.tableId);
    if (automation && automation.triggerCol) {
      // If the triggerCol value changed, send email
      const triggerCol = automation.triggerCol;
      if (oldTask && oldTask.values[triggerCol] !== values[triggerCol]) {
        // Compose email
        const subject = `Task updated: ${table.name}`;
        let html = `<h2>Task Update</h2><ul>`;
        (automation.cols || []).forEach(colId => {
          const col = (table.columns || []).find(c => c.id === colId);
          if (col) {
            html += `<li><b>${col.name}:</b> ${JSON.stringify(values[colId])}</li>`;
          }
        });
        html += `</ul>`;
        // Send email to all recipients
        if (automation.recipients && automation.recipients.length > 0) {
          try {
            await fetch('http://localhost:4000/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: automation.recipients.join(','),
                subject,
                text: subject,
                html
              })
            });
          } catch (err) {
            console.error('Failed to send email:', err);
          }
        }
      }
    }
    // --- END EMAIL AUTOMATION ---
    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /api/tables/:tableId/tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tables/:tableId/tasks', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table || !table.tasks) return res.status(404).json({ error: 'Table not found' });
  const { id } = req.body;
  table.tasks = table.tasks.filter(task => task.id !== id);
  writeJson(tablesFile, tables);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Express server running on http://192.168.0.14:${PORT}`);
});
