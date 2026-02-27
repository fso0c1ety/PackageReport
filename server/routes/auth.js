const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const db = require('../db');
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key_here'; // In production, use environment variable


// Login Endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Account not set up for password login. Please register again with the same email to set a password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Register Endpoint
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const existingUser = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      if (existingUser.password) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Update legacy user with password
      await db.query(
        'UPDATE users SET name = $1, password = $2 WHERE id = $3',
        [name, hashedPassword, existingUser.id]
      );
      return res.json({ success: true, message: 'Account updated with password successfully' });
    }

    // Create new user
    const userId = uuidv4();
    await db.query(
      'INSERT INTO users (id, name, email, avatar, password) VALUES ($1, $2, $3, $4, $5)',
      [userId, name, email, null, hashedPassword]
    );

    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

module.exports = router;
