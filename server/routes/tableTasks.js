const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
// PUT /tables/:tableId/tasks/order - update the order of all tasks in a table
router.put('/tables/:tableId/tasks/order', (req, res) => {
  const { rows } = req.body;
  console.log('[ORDER] Received new row order for table', req.params.tableId, rows);
  if (!Array.isArray(rows)) {
    console.error('[ORDER] Missing rows array in request body');
    return res.status(400).json({ error: 'Missing rows array' });
  }
  let tables = readJson(tablesFile);
  const tableIdx = tables.findIndex(t => t.id === req.params.tableId);
  if (tableIdx === -1) {
    console.error('[ORDER] Table not found:', req.params.tableId);
    return res.status(404).json({ error: 'Table not found' });
  }
  tables[tableIdx].tasks = rows;
  writeJson(tablesFile, tables);
  console.log('[ORDER] Saved new row order for table', req.params.tableId, tables[tableIdx].tasks);
  res.json({ success: true, tasks: tables[tableIdx].tasks });
});
// server/routes/tableTasks.js

const dataDir = path.join(__dirname, '../data');
const tablesFile = path.join(dataDir, 'tables.json');

function readJson(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// GET /tables/:tableId/tasks - get all tasks for a table
router.get('/tables/:tableId/tasks', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  res.json(table.tasks || []);
});

// PUT /tables/:tableId/tasks - update a task in a table
router.put('/tables/:tableId/tasks', (req, res) => {
  const { id, values } = req.body;
  console.log('[PUT TASK]', { id, values: values ? Object.keys(values) : 'null' });

  if (!id) return res.status(400).json({ error: 'Missing task id' });
  const tables = readJson(tablesFile);
  const tableIdx = tables.findIndex(t => t.id === req.params.tableId);
  if (tableIdx === -1) {
    console.error('[PUT TASK] Table not found:', req.params.tableId);
    return res.status(404).json({ error: 'Table not found' });
  }
  
  const table = tables[tableIdx];
  const taskIdx = table.tasks.findIndex(task => task.id === id);
  console.log('[PUT TASK] Found task at index:', taskIdx);
  
  const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });

  if (taskIdx !== -1) {
    const task = table.tasks[taskIdx];
    const oldValues = task.values || {};
    const oldActivity = task.activity || [];
    const newActivity = [];

    if (values) {
      console.log('[PUT TASK] Comparing values:', { old: oldValues, new: values });
      Object.keys(values).forEach(key => {
        if (key === 'message') return; // Skip chat messages
        
        // Simple comparison (handle primitive types)
        const oldVal = oldValues[key];
        const newVal = values[key];
        
        // Check if value actually changed (ignore type coercion for now, but strict is better)
        // Use JSON stringify to handle objects/arrays deep check if needed, but simple !== works for primitives
        // treat undefined/null/empty string as same-ish for UX? No, explicit change is better.
        const oldStr = JSON.stringify(oldVal);
        const newStr = JSON.stringify(newVal);
        
        if (oldStr !== newStr) {
          console.log(`[PUT TASK] Change detected for ${key}:`, oldStr, '->', newStr);
          const col = (table.columns || []).find(c => c.id === key);
          const colName = col ? col.name : (key === 'priority' ? 'Priority' : (key === 'status' ? 'Status' : 'Unknown Column'));
          
          let logText = `Updated ${colName}`;
           // Add specific details for status or priority
           if (col && (col.type === 'Status' || col.type === 'Priority' || col.id === 'priority')) {
              logText += ` to "${values[key]}"`;
           } else if (!col && (key === 'priority' || key === 'status')) {
              logText += ` to "${values[key]}"`;
           }

          newActivity.push({
            text: logText,
            time: timestamp,
            user: "User"
          });
        }
      });
      
      console.log('[PUT TASK] New activity entries:', newActivity);

      // Update task
      task.values = values;
      // Always persist activity array if it exists or new entries are added
      if (newActivity.length > 0) {
        task.activity = [...newActivity, ...oldActivity]; // Newest first
      } else if (!task.activity) {
         task.activity = []; // Ensure array exists even if empty
      }
    }
  } else {
    // New task
    console.log('[PUT TASK] Creating new task');
    table.tasks.push({
      id,
      values,
      activity: [{
        text: "Task created",
        time: timestamp,
        user: "User"
      }]
    });
  }
  
  tables[tableIdx] = table;
  writeJson(tablesFile, tables);
  console.log('[PUT TASK] Saved tables.json');
  const updatedTask = table.tasks.find(task => task.id === id);
  res.json({ success: true, task: updatedTask });
});

// GET /tables/:tableId/tasks/:taskId - get a single task
router.get('/tables/:tableId/tasks/:taskId', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  const task = (table.tasks || []).find(task => task.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

module.exports = router;
