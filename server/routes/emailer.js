// server/routes/emailer.js
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// POST /api/send-email
router.post('/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;
  if (!to) return res.status(400).json({ error: 'Missing recipient' });
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'valonhalili74@gmail.com',
        pass: 'aoyojljhvpwhrswg',
      },
    });
    const info = await transporter.sendMail({
      from: 'valonhalili74@gmail.com',
      to,
      subject,
      text,
      html,
    });
    res.json({ success: true, info });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
