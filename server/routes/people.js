// API endpoint to get all unique people (name/email) from all tasks in all tables
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

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

router.get('/people', (req, res) => {
  const tables = readJson(tablesFile);
  const peopleMap = {};
  tables.forEach(table => {
    if (Array.isArray(table.tasks)) {
      table.tasks.forEach(task => {
        const owners = task.values && Array.isArray(task.values.owner) ? task.values.owner : [];
        owners.forEach(person => {
          if (person && person.email) {
            peopleMap[person.email] = { name: person.name, email: person.email, avatar: null };
          }
        });
      });
    }
  });
  res.json(Object.values(peopleMap));
});

module.exports = router;
