const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const db = require('../db');
const { getJwtSecret } = require('../config/env');
const { createRateLimiter } = require('../middleware/rateLimit');
const { isValidEmail, validatePassword } = require('../middleware/validate');
const logger = require('../utils/logger');
const { sendEmail } = require('../mailer');
const authenticateToken = require('../middleware/authenticateToken');
const billingService = require('../services/billingService');

const SECRET_KEY = getJwtSecret();
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'auth' });
const passwordResetRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: 'password-reset' });

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');


// Login Endpoint
router.post('/login', authRateLimit, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
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

    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`;
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: avatarUrl } });
  } catch (err) {
    logger.error('login_failed', { requestId: req.requestId, email, error: err.message });
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Register Endpoint
router.post('/register', authRateLimit, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const existingUser = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      if (existingUser.password) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Update legacy user with password and generate avatar
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
      await db.query(
        'UPDATE users SET name = $1, password = $2, avatar = $3 WHERE id = $4',
        [name, hashedPassword, avatarUrl, existingUser.id]
      );
      await billingService.ensureSubscription(existingUser.id);
      return res.json({ success: true, message: 'Account updated with password and avatar successfully' });
    }

    // Create new user with generated avatar
    const userId = uuidv4();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
    await db.query(
      'INSERT INTO users (id, name, email, avatar, password) VALUES ($1, $2, $3, $4, $5)',
      [userId, name, email, avatarUrl, hashedPassword]
    );
    await billingService.ensureSubscription(userId);

    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    logger.error('registration_failed', { requestId: req.requestId, email, error: err.message });
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

router.post('/forgot-password', passwordResetRateLimit, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const genericResponse = {
    success: true,
    message: 'If an account exists for this email, a password reset link has been sent.',
  };

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const result = await db.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW()', [user.id]);
    await db.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, requested_ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), user.id, tokenHash, expiresAt, req.ip || null]
    );

    const appUrl = String(
      process.env.APP_URL
      || process.env.NEXT_PUBLIC_FRONTEND_URL
      || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const displayName = user.name || 'there';
    const safeName = escapeHtml(displayName);

    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your Smart Manage password',
        text: `Hi ${displayName}, reset your password using this link: ${resetUrl}. This link expires in 30 minutes.`,
        html: `<p>Hi ${safeName},</p><p>Use the link below to reset your Smart Manage password. It expires in 30 minutes and can be used once.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
      });
    } catch (emailError) {
      await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
      logger.error('password_reset_email_failed', {
        requestId: req.requestId,
        userId: user.id,
        error: emailError.message,
      });
      if (process.env.NODE_ENV !== 'production') {
        return res.status(503).json({
          error: 'Password reset email could not be sent. Configure BREVO_API_KEY and EMAIL_FROM in .env, then try again.',
        });
      }
    }

    logger.info('password_reset_requested', { requestId: req.requestId, userId: user.id });
    return res.json(genericResponse);
  } catch (err) {
    logger.error('password_reset_request_failed', { requestId: req.requestId, error: err.message });
    return res.status(500).json({ error: 'Unable to process password reset request' });
  }
});

router.post('/reset-password', passwordResetRateLimit, async (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  const passwordError = validatePassword(password);
  if (!token) return res.status(400).json({ error: 'Reset token is required' });
  if (passwordError) return res.status(400).json({ error: passwordError });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [hashResetToken(token)]
    );
    const resetToken = result.rows[0];
    if (!resetToken) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, resetToken.user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [resetToken.user_id]);
    await client.query('COMMIT');
    logger.info('password_reset_completed', { requestId: req.requestId, userId: resetToken.user_id });
    return res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('password_reset_failed', { requestId: req.requestId, error: err.message });
    return res.status(500).json({ error: 'Unable to reset password' });
  } finally {
    client.release();
  }
});

router.post('/change-password', authenticateToken, authRateLimit, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  const passwordError = validatePassword(newPassword);
  if (!currentPassword) return res.status(400).json({ error: 'Current password is required' });
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const result = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user?.password || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ error: 'New password must be different from the current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [req.user.id]);
    logger.info('password_changed', { requestId: req.requestId, userId: req.user.id });
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    logger.error('password_change_failed', { requestId: req.requestId, userId: req.user.id, error: err.message });
    return res.status(500).json({ error: 'Unable to update password' });
  }
});

module.exports = router;
