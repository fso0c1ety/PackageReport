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
  if (!id) return res.status(400).json({ error: 'Missing task id' });
  let tables = readJson(tablesFile);
  const tableIdx = tables.findIndex(t => t.id === req.params.tableId);
  if (tableIdx === -1) return res.status(404).json({ error: 'Table not found' });
  let table = tables[tableIdx];
  const taskIdx = table.tasks.findIndex(task => task.id === id);
  if (taskIdx !== -1) {
    table.tasks[taskIdx].values = values;
  } else {
    table.tasks.push({ id, values });
  }
  tables[tableIdx] = table;
  writeJson(tablesFile, tables);
  res.json({ success: true, task: table.tasks.find(task => task.id === id) });
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
