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
  const { triggerCol, cols, recipients } = req.body;
  const tableId = req.params.tableId;
  const idx = automations.findIndex(a => a.tableId === tableId);
  const automation = { tableId, triggerCol, cols, recipients };
  if (idx !== -1) automations[idx] = automation;
  else automations.push(automation);
  writeJson(automationFile, automations);
  res.json({ success: true });
});

// Get automation for a table
router.get('/automation/:tableId', (req, res) => {
  const automations = readJson(automationFile);
  const automation = automations.find(a => a.tableId === req.params.tableId);
  res.json(automation || null);
});

module.exports = router;
