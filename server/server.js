// --- Task Order Endpoint for Drag-and-Drop ---
// (Endpoint is now placed at the end of the file, after all initialization)
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cors = require('cors');
const multer = require('multer');

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
const peopleRoute = require('./routes/people');
const automationRoute = require('./routes/automation');
const emailerRoute = require('./routes/emailer');
// const tableTasksRoute = require('./routes/tableTasks');
app.use('/api', peopleRoute);
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'data/uploads')));

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

app.use('/api', automationRoute);
app.use('/api', emailerRoute);
// app.use('/api', tableTasksRoute);
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

// Get a single workspace by ID
app.get('/api/workspaces/:workspaceId', (req, res) => {
  const workspaces = readJson(workspacesFile);
  const workspace = workspaces.find(w => w.id === req.params.workspaceId);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }
  res.json(workspace);
});

// Create a new workspace
app.post('/api/workspaces', (req, res) => {
  const workspaces = readJson(workspacesFile);
  const tables = readJson(tablesFile);
  const newWorkspace = {
    id: uuidv4(),
    name: req.body.name || 'Untitled Workspace'
  };
  workspaces.push(newWorkspace);
  writeJson(workspacesFile, workspaces);
  // Create a default table for this workspace
  const defaultTable = {
    id: uuidv4(),
    name: `${newWorkspace.name} Table`,
    columns: [
      { id: uuidv4(), name: 'Task', type: 'Text', order: 0 },
      { id: uuidv4(), name: 'Cuntry', type: 'Text', order: 1 },
      { id: uuidv4(), name: 'Message', type: 'Text', order: 2 }
    ],
    createdAt: Date.now(),
    tasks: [],
    workspaceId: newWorkspace.id
  };
  tables.push(defaultTable);
  writeJson(tablesFile, tables);
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
  const fullCountryList = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","East Timor","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Korea, North","Korea, South","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
  ];
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    columns = [{
      id: uuidv4(),
      name: 'Task',
      type: 'Text',
      order: 0
    }];
  }
  columns = columns.map(col => {
    if (col.type && col.type.toLowerCase() === 'country') {
      return {
        ...col,
        options: fullCountryList.map(c => ({ value: c }))
      };
    }
    return col;
  });
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

// Get all tasks for a table
app.get('/api/tables/:tableId/tasks', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table || !table.tasks) return res.json([]);
  // Always return tasks sorted by order (default 0 if missing)
  const sorted = [...table.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  res.json(sorted);
});

// Get a specific task by ID for a table
app.get('/api/tables/:tableId/tasks/:taskId', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table || !Array.isArray(table.tasks)) {
    return res.status(404).json({ error: 'Table not found' });
  }
  const task = table.tasks.find(task => task.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
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

// Update document content
app.put('/api/tables/:tableId/doc', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  table.docContent = req.body.content;
  writeJson(tablesFile, tables);
  res.json({ success: true, content: table.docContent });
});

app.put('/api/tables/:tableId/tasks', async (req, res) => {
  const debugLogs = [];
  const log = (msg, obj) => {
    console.log(msg, obj);
    debugLogs.push({ msg, obj });
  };
  log('[TASK UPDATE] Incoming PUT /api/tables/:tableId/tasks', {
    tableId: req.params.tableId,
    body: req.body
  });
  try {
    const tables = readJson(tablesFile);
    const table = tables.find(t => t.id === req.params.tableId);
    if (!table || !table.tasks) {
      log('Table not found or missing tasks', req.params.tableId);
      return res.status(404).json({ error: 'Table not found' });
    }
    const { id, values } = req.body;
    if (!id || typeof values !== 'object') {
      log('Invalid request body for task update', req.body);
      return res.status(400).json({ error: 'Invalid request body' });
    }
    let found = false;
    let oldTask = null; // Declare outside to make it accessible for automation check
    
    // Find task index first to avoid map overhead if possible, but map is cleaner for replacement
    const taskIndex = table.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
       log('Task not found in table ' + req.params.tableId, id);
       return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = table.tasks[taskIndex];
    oldTask = JSON.parse(JSON.stringify(task)); // Deep copy for automation/logging
    
    // --- Activity Logging Logic ---
    const oldValues = task.values || {};
    const newValues = values || {};
    const timestamp = new Date().toISOString();
    const newActivity = [];
    const oldActivity = task.activity || [];

    Object.keys(newValues).forEach(key => {
      if (key === 'message') return; // Skip chat messages
      
      const oldVal = oldValues[key];
      const newVal = newValues[key];
      const oldStr = JSON.stringify(oldVal);
      const newStr = JSON.stringify(newVal);
      
      if (oldStr !== newStr) {
        log(`[ACTIVITY] Change detected for ${key}`, { from: oldStr, to: newStr });
        const col = (table.columns || []).find(c => c.id === key);
        const colName = col ? col.name : (key === 'priority' ? 'Priority' : (key === 'status' ? 'Status' : 'Unknown Column'));
        
        let logText = `Updated ${colName}`;
        // Add specific details for status or priority
        if (col && (col.type === 'Status' || col.type === 'Priority' || col.id === 'priority')) {
          logText += ` to "${newVal}"`;
        } else if (!col && (key === 'priority' || key === 'status')) {
          logText += ` to "${newVal}"`;
        } else if (newVal && typeof newVal !== 'object') {
           // For simple text fields show the value
           if (newVal.toString().length < 20) {
              logText += ` to "${newVal}"`;
           }
        }

        newActivity.push({
          text: logText,
          time: timestamp,
          user: "User"
        });
      }
    });

    // Update task
    task.values = values; 
    if (newActivity.length > 0) {
      task.activity = [...newActivity, ...oldActivity];
    } else if (!task.activity) {
      task.activity = [];
    }
    
    // Update in array
    table.tasks[taskIndex] = task;
    found = true;

    writeJson(tablesFile, tables);
    // Re-read file to confirm write
    const afterWrite = readJson(tablesFile);
    const updatedTable = afterWrite.find(t => t.id === req.params.tableId);
    const updatedTask = updatedTable && updatedTable.tasks ? updatedTable.tasks.find(task => task.id === id) : null;
    if (!updatedTask || JSON.stringify(updatedTask.values) !== JSON.stringify(values)) {
      log('Persistence error: Task values after write do not match expected.', { expected: values, actual: updatedTask ? updatedTask.values : null });
      return res.status(500).json({ error: 'Persistence error: Task not updated correctly.' });
    }

    // --- EMAIL AUTOMATION LOGIC ---
    const automationFile = path.join(dataDir, 'automation.json');
    let automations = [];
    try { automations = JSON.parse(fs.readFileSync(automationFile, 'utf-8')); } catch {}
    // Check for per-task automation config
    const perTaskAutomation = automations.find(a => a.taskId === id);
    if (perTaskAutomation && perTaskAutomation.triggerCol && perTaskAutomation.enabled) {
      log('[AUTOMATION] Loaded per-task automation config', perTaskAutomation);
      const triggerCol = perTaskAutomation.triggerCol;
      log('[AUTOMATION] Checking triggerCol', { triggerCol, oldValue: oldTask ? oldTask.values[triggerCol] : undefined, newValue: values[triggerCol] });
      if (oldTask && oldTask.values[triggerCol] !== values[triggerCol]) {
        log('[AUTOMATION] TriggerCol value changed, preparing to send email', { from: oldTask.values[triggerCol], to: values[triggerCol] });
        const subject = `Task updated: ${table.name}`;
        let html = `<h2>Task Update</h2><ul>`;
        (perTaskAutomation.cols || []).forEach(colId => {
          const col = (table.columns || []).find(c => c.id === colId);
          if (col) {
            html += `<li><b>${col.name}:</b> ${JSON.stringify(values[colId])}</li>`;
          }
        });
        html += `</ul>`;
        if (perTaskAutomation.recipients && perTaskAutomation.recipients.length > 0) {
          try {
            log('[AUTOMATION] Sending email via fetch', {
              url: 'http://localhost:4000/api/send-email',
              to: perTaskAutomation.recipients.join(','),
              subject,
              html
            });
            const fetchRes = await fetch('http://localhost:4000/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: perTaskAutomation.recipients.join(','),
                subject,
                text: subject,
                html
              })
            });
            const fetchJson = await fetchRes.json().catch(() => ({}));
            log('[AUTOMATION] Email fetch response', { status: fetchRes.status, body: fetchJson });
            // Log the sent email to email_updates.json
            const emailUpdatesFile = path.join(dataDir, 'email_updates.json');
            let emailUpdates = [];
            try { emailUpdates = JSON.parse(fs.readFileSync(emailUpdatesFile, 'utf-8')); } catch {}
            emailUpdates.push({
              recipients: perTaskAutomation.recipients,
              subject,
              html,
              timestamp: Date.now(),
              tableId: req.params.tableId,
              taskId: id,
              triggerCol,
              changedValue: values[triggerCol]
            });
            if (emailUpdates.length > 20) emailUpdates = emailUpdates.slice(-20);
            fs.writeFileSync(emailUpdatesFile, JSON.stringify(emailUpdates, null, 2));
          } catch (err) {
            log('[AUTOMATION] Failed to send email', err);
          }
        } else {
          log('[AUTOMATION] No recipients specified', perTaskAutomation.recipients);
        }
      } else {
        log('[AUTOMATION] TriggerCol value did not change, skipping email', { old: oldTask ? oldTask.values[triggerCol] : undefined, new: values[triggerCol] });
      }
      // If per-task automation exists, do NOT run table-level automation
      // (return here to prevent table-level automation for this task)
      res.set('X-Debug-Logs', encodeURIComponent(JSON.stringify(debugLogs)));
      return res.json({ success: true });
    }
    // Only if no per-task automation, check for table-level automation
    const tableAutomation = automations.find(a => a.tableId === req.params.tableId && !a.taskId);
    if (tableAutomation && tableAutomation.triggerCol && tableAutomation.enabled) {
      log('[AUTOMATION] Loaded table-level automation config', tableAutomation);
      const triggerCol = tableAutomation.triggerCol;
      log('[AUTOMATION] Checking triggerCol', { triggerCol, oldValue: oldTask ? oldTask.values[triggerCol] : undefined, newValue: values[triggerCol] });
      if (oldTask && oldTask.values[triggerCol] !== values[triggerCol]) {
        log('[AUTOMATION] TriggerCol value changed, preparing to send email', { from: oldTask.values[triggerCol], to: values[triggerCol] });
        const subject = `Task updated: ${table.name}`;
        let html = `<h2>Task Update</h2><ul>`;
        (tableAutomation.cols || []).forEach(colId => {
          const col = (table.columns || []).find(c => c.id === colId);
          if (col) {
            html += `<li><b>${col.name}:</b> ${JSON.stringify(values[colId])}</li>`;
          }
        });
        html += `</ul>`;
        if (tableAutomation.recipients && tableAutomation.recipients.length > 0) {
          try {
            log('[AUTOMATION] Sending email via fetch', {
              url: 'http://localhost:4000/api/send-email',
              to: tableAutomation.recipients.join(','),
              subject,
              html
            });
            const fetchRes = await fetch('http://localhost:4000/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: tableAutomation.recipients.join(','),
                subject,
                text: subject,
                html
              })
            });
            const fetchJson = await fetchRes.json().catch(() => ({}));
            log('[AUTOMATION] Email fetch response', { status: fetchRes.status, body: fetchJson });
            // Log the sent email to email_updates.json
            const emailUpdatesFile = path.join(dataDir, 'email_updates.json');
            let emailUpdates = [];
            try { emailUpdates = JSON.parse(fs.readFileSync(emailUpdatesFile, 'utf-8')); } catch {}
            emailUpdates.push({
              recipients: tableAutomation.recipients,
              subject,
              html,
              timestamp: Date.now(),
              tableId: req.params.tableId,
              taskId: id,
              triggerCol,
              changedValue: values[triggerCol]
            });
            if (emailUpdates.length > 20) emailUpdates = emailUpdates.slice(-20);
            fs.writeFileSync(emailUpdatesFile, JSON.stringify(emailUpdates, null, 2));
          } catch (err) {
            log('[AUTOMATION] Failed to send email', err);
          }
        } else {
          log('[AUTOMATION] No recipients specified', tableAutomation.recipients);
        }
      } else {
        log('[AUTOMATION] TriggerCol value did not change, skipping email', { old: oldTask ? oldTask.values[triggerCol] : undefined, new: values[triggerCol] });
      }
    } else {
      log('[AUTOMATION] No automation config or triggerCol for this task or table', tableAutomation);
    }
    // --- END EMAIL AUTOMATION ---
    res.set('X-Debug-Logs', encodeURIComponent(JSON.stringify(debugLogs)));
    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /api/tables/:tableId/tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tables/:tableId/tasks/:taskId', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table || !table.tasks) return res.status(404).json({ error: 'Table not found' });
  const taskId = req.params.taskId;
  const initialLength = table.tasks.length;
  table.tasks = table.tasks.filter(task => task.id !== taskId);
  
  if (table.tasks.length === initialLength) {
     return res.status(404).json({ error: 'Task not found' });
  }

  writeJson(tablesFile, tables);
  res.json({ success: true });
});

// Endpoint to get recent email updates
app.get('/api/email-updates', (req, res) => {
  const emailUpdatesFile = path.join(dataDir, 'email_updates.json');
  let emailUpdates = [];
  try { emailUpdates = JSON.parse(fs.readFileSync(emailUpdatesFile, 'utf-8')); } catch {}
  res.json(emailUpdates);
});


// --- Task Order Endpoint for Drag-and-Drop ---
app.put('/api/tables/:tableId/tasks/order', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table || !table.tasks) {
    return res.status(404).json({ error: 'Table not found' });
  }
  const { orderedTaskIds } = req.body;
  if (!Array.isArray(orderedTaskIds)) {
    return res.status(400).json({ error: 'orderedTaskIds must be array' });
  }
  // update order values
  table.tasks.forEach(task => {
    const index = orderedTaskIds.indexOf(task.id);
    if (index !== -1) {
      task.order = index;
    }
  });
  writeJson(tablesFile, tables);
  res.json({ success: true });
});


// --- Table Chat Endpoints ---
const tableChatsFile = path.join(dataDir, 'tableChats.json');

// Get chat messages for a table
app.get('/api/tables/:tableId/chat', (req, res) => {
  let allChats = {};
  if (fs.existsSync(tableChatsFile)) {
    try {
      allChats = JSON.parse(fs.readFileSync(tableChatsFile, 'utf-8'));
    } catch (e) {
      allChats = {};
    }
  }
  const tableId = req.params.tableId;
  const messages = allChats[tableId] || [];
  res.json(messages);
});

// Post a new chat message
app.post('/api/tables/:tableId/chat', (req, res) => {
  let allChats = {};
  if (fs.existsSync(tableChatsFile)) {
    try {
      allChats = JSON.parse(fs.readFileSync(tableChatsFile, 'utf-8'));
    } catch (e) {
      allChats = {};
    }
  }
  const tableId = req.params.tableId;
  
  if (!allChats[tableId]) {
    allChats[tableId] = [];
  }
  
  const newMessage = {
    id: uuidv4(),
    ...req.body,
    // Ensure vital fields if missing
    timestamp: req.body.timestamp || Date.now(),
  };
  
  allChats[tableId].push(newMessage);
  
  try {
    fs.writeFileSync(tableChatsFile, JSON.stringify(allChats, null, 2));
  } catch (err) {
    console.error('Error writing tableChats.json:', err);
  }
  
  res.json(newMessage);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express server running on http://0.0.0.0:${PORT}`);
});
