
// ...existing code...
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const tablesFile = path.join(dataDir, 'tables.json');
const tasksFile = path.join(dataDir, 'tasks.json');

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
app.get('/api/tables', (req, res) => {
  res.json(readJson(tablesFile));
});

app.post('/api/tables', (req, res) => {
  const tables = readJson(tablesFile);
  let columns = req.body.columns;
  // If no columns provided, add a default column
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

app.put('/api/tables/:tableId/tasks', (req, res) => {
  const tables = readJson(tablesFile);
  const table = tables.find(t => t.id === req.params.tableId);
  if (!table || !table.tasks) return res.status(404).json({ error: 'Table not found' });
  const { id, values } = req.body;
  table.tasks = table.tasks.map(task => task.id === id ? { ...task, values } : task);
  writeJson(tablesFile, tables);
  res.json({ success: true });
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
  console.log(`Express server running on http://localhost:${PORT}`);
});
