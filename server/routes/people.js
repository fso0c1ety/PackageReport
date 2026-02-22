// API endpoint to get all unique people (name/email) from all tasks in all tables
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const tablesFile = path.join(dataDir, 'tables.json');
const peopleFile = path.join(dataDir, 'people.json');

function readJson(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    return [];
  }
}


// GET all people: union of invited and assigned
router.get('/people', (req, res) => {
  const tables = readJson(tablesFile);
  const invited = readJson(peopleFile);
  const peopleMap = {};
  // Add assigned people from tasks
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
  // Add invited people
  invited.forEach(person => {
    if (person && person.email) {
      peopleMap[person.email] = { name: person.name, email: person.email, avatar: null };
    }
  });
  res.json(Object.values(peopleMap));
});

// POST to invite a new person
router.post('/people', (req, res) => {
  const { name, email } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });
  let people = readJson(peopleFile);
  if (!people.some(p => p.email === email)) {
    people.push({ name, email, avatar: null });
    fs.writeFileSync(peopleFile, JSON.stringify(people, null, 2));
  }
  res.json({ success: true });
});

module.exports = router;
