// server/routes/emailer.js
const express = require('express');
const { sendEmail } = require('../mailer');
const router = express.Router();

// POST /api/send-email
router.post('/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;
  if (!to) return res.status(400).json({ error: 'Missing recipient' });
  try {
    const info = await sendEmail({ to, subject, text, html });
    res.json({ success: true, info });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
