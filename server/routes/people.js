const express = require('express');
const router = express.Router();
const db = require('../db');

// GET people (registered users), with optional search and limit
router.get('/people', async (req, res) => {
  try {
    const search = req.query.q;
    let result;

    if (search) {
      result = await db.query(
        'SELECT id, name, email FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 10',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT id, name, email FROM users LIMIT 10');
    }

    const usersWithAvatars = result.rows.map(user => {
      // Generate a dynamic avatar using ui-avatars.com based on the user's name
      // Use random background colors and make it visually pleasing
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`;
      return {
        ...user,
        avatar: avatarUrl
      };
    });

    res.json(usersWithAvatars);
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
