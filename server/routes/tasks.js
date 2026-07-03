// server/routes/tasks.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dataDir = path.join(__dirname, '../data');
const tasksFile = path.join(dataDir, 'tasks.json');

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

// PUT /tasks - update a task (including messages)
router.put('/tasks', (req, res) => {
  const { id, values } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing task id' });
  let tasks = readJson(tasksFile);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    tasks[idx].values = values;
    writeJson(tasksFile, tasks);
    return res.json({ success: true, task: tasks[idx] });
  }
  // If task not found, optionally create it
  const newTask = { id, values };
  tasks.push(newTask);
  writeJson(tasksFile, tasks);
  res.json({ success: true, task: newTask });
});

// GET /tasks/:id - get a task by id
router.get('/tasks/:id', (req, res) => {
  const tasks = readJson(tasksFile);
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

module.exports = router;
