// server/routes/automation.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const dataDir = path.join(__dirname, '../data');
const automationFile = path.join(dataDir, 'automation.json');

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

// Save automation for a table
router.post('/automation/:tableId', (req, res) => {
  const automations = readJson(automationFile);
  const { triggerCol, cols, recipients, enabled, taskId } = req.body;
  const tableId = req.params.tableId;
  let idx;
  let automation;
  if (taskId) {
    // Save per-task automation config
    idx = automations.findIndex(a => a.taskId === taskId);
    automation = { tableId, taskId, triggerCol, cols, recipients, enabled };
  } else {
    // Save table-level automation config
    idx = automations.findIndex(a => a.tableId === tableId && !a.taskId);
    automation = { tableId, triggerCol, cols, recipients, enabled };
  }
  if (idx !== -1) automations[idx] = automation;
  else automations.push(automation);
  writeJson(automationFile, automations);
  res.json({ success: true });
});

// Get automation for a table
// Get all automation configs for a table (including per-task)
router.get('/automation/:tableId', (req, res) => {
  const automations = readJson(automationFile);
  const tableAutomations = automations.filter(a => a.tableId === req.params.tableId);
  res.json(tableAutomations);
});

module.exports = router;
