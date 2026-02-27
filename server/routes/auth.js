const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const peopleFile = path.join(__dirname, '../data/people.json');
const SECRET_KEY = 'your_secret_key_here'; // In production, use environment variable

// Helper function to read people
function getPeople() {
  if (!fs.existsSync(peopleFile)) {
    return [];
  }
  const data = fs.readFileSync(peopleFile, 'utf8');
  return JSON.parse(data);
}

// Helper function to save people
function savePeople(people) {
  fs.writeFileSync(peopleFile, JSON.stringify(people, null, 2));
}

// Login Endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const people = getPeople();
  const user = people.find((p) => p.email === email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // If user has no password stored (legacy user), we can't authenticate them securely directly.
  // They should register or reset password. For simplicity here, we'll specificy:
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
});

// Register Endpoint
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const people = getPeople();
  const existingUserIndex = people.findIndex((p) => p.email === email);

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingUserIndex !== -1) {
    // Determine if we are "updating" a legacy user or if user already has password
    if (people[existingUserIndex].password) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    // Update legacy user with password
    people[existingUserIndex].password = hashedPassword;
    // Update name if provided, or keep existing? Let's update.
    people[existingUserIndex].name = name;
    if (!people[existingUserIndex].id) people[existingUserIndex].id = uuidv4();
    
    savePeople(people);
    return res.json({ success: true, message: 'Account updated with password successfully' });
  }

  // Create new user
  const newUser = {
    id: uuidv4(),
    name,
    email,
    avatar: null, // Default
    password: hashedPassword,
  };

  people.push(newUser);
  savePeople(people);

  res.json({ success: true, message: 'User registered successfully' });
});

module.exports = router;
