const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all people (registered users)
router.get('/people', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, avatar FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching people:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST to invite/add a person (already handled by register, but keeping for compatibility)
router.post('/people', async (req, res) => {
  const { name, email } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });
  try {
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rowCount === 0) {
      const { v4: uuidv4 } = require('uuid');
      await db.query('INSERT INTO users (id, name, email) VALUES ($1, $2, $3)', [uuidv4(), name, email]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding person:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
