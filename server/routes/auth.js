const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const db = require('../db');
const { getJwtSecret } = require('../config/env');
const { createRateLimiter } = require('../middleware/rateLimit');
const { isValidEmail, validatePassword } = require('../middleware/validate');
const logger = require('../utils/logger');
const { sendEmail } = require('../mailer');
const { buildAccountActionEmail, buildPasswordResetEmail } = require('../utils/emailTemplates');
const authenticateToken = require('../middleware/authenticateToken');
const billingService = require('../services/billingService');
const {
  createSession,
  createLegacyCompatibleSession,
  isMissingSessionSchema,
  revokeSessions,
  rotateSession,
  sessionMetadata,
} = require('../services/authSessionService');
const { consumeAccountToken, replaceAccountToken } = require('../services/accountTokenService');
const { getLoginProtectionState, recordAuthenticationEvent } = require('../services/loginProtectionService');

const SECRET_KEY = getJwtSecret();
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'auth' });
const passwordResetRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: 'password-reset' });

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const REFRESH_COOKIE = 'smart_manage_refresh';
const ACCESS_COOKIE = 'smart_manage_access';
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api',
  maxAge: 30 * 24 * 60 * 60 * 1000,
});
const accessCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 20 * 60 * 1000,
});
const readCookie = (req, name) => String(req.headers.cookie || '')
  .split(';')
  .map((entry) => entry.trim().split('='))
  .find(([key]) => key === name)?.[1];
const publicAppUrl = () => String(
  process.env.APP_URL || process.env.NEXT_PUBLIC_FRONTEND_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://package-report.vercel.app' : 'http://localhost:3000')
).replace(/\/$/, '');
const registrationResponse = {
  success: true,
  verificationRequired: true,
  message: 'Check your email to verify or activate your account before signing in.',
};
const pendingProfileFromRequest = (req, { name, firstName, lastName, passwordHash }) => ({
  name,
  firstName,
  lastName,
  passwordHash,
  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`,
  phone: String(req.body?.phone || ''),
  jobTitle: String(req.body?.job_title || ''),
  company: String(req.body?.company || ''),
  birthDate: req.body?.birth_date || null,
  gender: req.body?.gender || null,
});
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
    const protection = await getLoginProtectionState(db, { email, ipAddress: req.ip || null });
    if (protection.retryAfter > 0) {
      res.setHeader('Retry-After', protection.retryAfter);
      return res.status(429).json({ error: 'Invalid credentials. Please wait before trying again.' });
    }
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      await recordAuthenticationEvent(db, { email, eventType: 'login_failed', req, metadata: { reason: 'invalid_credentials' } });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      await recordAuthenticationEvent(db, { userId: user.id, email, eventType: 'login_failed', req, metadata: { reason: 'invalid_credentials' } });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await recordAuthenticationEvent(db, { userId: user.id, email, eventType: 'login_failed', req, metadata: { suspicious: protection.suspicious } });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let session;
    try {
      session = await createSession(db, user, SECRET_KEY, sessionMetadata(req));
    } catch (sessionError) {
      if (!isMissingSessionSchema(sessionError)) throw sessionError;
      session = createLegacyCompatibleSession(user, SECRET_KEY);
      logger.warn('auth_session_schema_missing_legacy_token_issued', { requestId: req.requestId, userId: user.id });
    }
    if (session.refreshToken) res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
    res.cookie(ACCESS_COOKIE, session.accessToken, accessCookieOptions());

    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`;
    await recordAuthenticationEvent(db, { userId: user.id, email, eventType: 'login_succeeded', req, metadata: { sessionId: session.sessionId } });
    res.json({
      token: session.accessToken,
      refreshToken: req.body?.nativeClient ? session.refreshToken : undefined,
      sessionId: session.sessionId,
      user: { id: user.id, name: user.name, email: user.email, avatar: avatarUrl },
    });
  } catch (err) {
    logger.error('login_failed', { requestId: req.requestId, email, error: err.message });
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

router.post('/auth/refresh', authRateLimit, async (req, res) => {
  const refreshToken = String(req.body?.refreshToken || readCookie(req, REFRESH_COOKIE) || '');
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const session = await rotateSession(client, refreshToken, SECRET_KEY, sessionMetadata(req));
    if (!session) {
      await client.query('ROLLBACK');
      res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
      res.clearCookie(ACCESS_COOKIE, { ...accessCookieOptions(), maxAge: undefined });
      return res.status(401).json({ error: 'Refresh session is invalid or expired' });
    }
    await client.query('COMMIT');
    res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
    res.cookie(ACCESS_COOKIE, session.accessToken, accessCookieOptions());
    return res.json({
      token: session.accessToken,
      refreshToken: req.body?.nativeClient ? session.refreshToken : undefined,
      sessionId: session.sessionId,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('refresh_session_failed', { requestId: req.requestId, error: err.message });
    return res.status(500).json({ error: 'Unable to refresh session' });
  } finally {
    client.release();
  }
});

router.post('/auth/logout', authenticateToken, async (req, res) => {
  await revokeSessions(db, req.user.id, { sessionId: req.user.sid || null, reason: 'logout' });
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.clearCookie(ACCESS_COOKIE, { ...accessCookieOptions(), maxAge: undefined });
  return res.json({ success: true });
});

router.post('/auth/logout-all', authenticateToken, async (req, res) => {
  await revokeSessions(db, req.user.id, { reason: 'logout_all' });
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.clearCookie(ACCESS_COOKIE, { ...accessCookieOptions(), maxAge: undefined });
  return res.json({ success: true });
});

// Register Endpoint
router.post('/register', authRateLimit, async (req, res) => {
  const firstName = String(req.body?.first_name || '').trim();
  const lastName = String(req.body?.last_name || '').trim();
  const name = String(req.body?.name || `${firstName} ${lastName}`).trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password || !firstName || !lastName) {
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
    const hashedPassword = await bcrypt.hash(password, 12);

    if (existingUser) {
      if (existingUser.password) {
        return res.json(registrationResponse);
      }

      const pendingProfile = pendingProfileFromRequest(req, { name, firstName, lastName, passwordHash: hashedPassword });
      const activation = await replaceAccountToken(db, {
        table: 'account_activation_tokens', userId: existingUser.id, pendingProfile,
      });
      const activationUrl = `${publicAppUrl()}/activate-account?token=${encodeURIComponent(activation.rawToken)}`;
      try {
        await sendEmail({
          to: existingUser.email,
          subject: 'Activate your Smart Manage account',
          text: `Confirm ownership and activate your account: ${activationUrl}. This link expires in 24 hours.`,
          html: buildAccountActionEmail({ displayName: existingUser.name || name, actionUrl: activationUrl, activation: true }),
        });
      } catch (emailError) {
        await db.query('DELETE FROM account_activation_tokens WHERE user_id=$1', [existingUser.id]);
        logger.error('account_activation_email_failed', { requestId: req.requestId, userId: existingUser.id, error: emailError.message });
      }
      logger.info('legacy_account_activation_requested', { requestId: req.requestId, userId: existingUser.id });
      return res.json(registrationResponse);
    }

    // Create new user with generated avatar
    const userId = uuidv4();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
    await db.query(
      `INSERT INTO users
       (id,name,email,avatar,password,first_name,last_name,phone,job_title,company,birth_date,gender,email_verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL)`,
      [userId, name, email, avatarUrl, hashedPassword, firstName, lastName, req.body.phone || '', req.body.job_title || '', req.body.company || '', req.body.birth_date || null, req.body.gender || null]
    );
    await billingService.ensureSubscription(userId);
    const verification = await replaceAccountToken(db, { table: 'email_verification_tokens', userId });
    const verificationUrl = `${publicAppUrl()}/verify-email?token=${encodeURIComponent(verification.rawToken)}`;
    try {
      await sendEmail({
        to: email,
        subject: 'Verify your Smart Manage email',
        text: `Verify your Smart Manage email: ${verificationUrl}. This link expires in 24 hours.`,
        html: buildAccountActionEmail({ displayName: name, actionUrl: verificationUrl }),
      });
    } catch (emailError) {
      logger.error('email_verification_send_failed', { requestId: req.requestId, userId, error: emailError.message });
    }
    res.json(registrationResponse);
  } catch (err) {
    logger.error('registration_failed', { requestId: req.requestId, email, error: err.message });
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

router.post('/auth/activate-account', authRateLimit, async (req, res) => {
  const token = String(req.body?.token || '');
  if (!token) return res.status(400).json({ error: 'Activation token is required' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const activation = await consumeAccountToken(client, { table: 'account_activation_tokens', rawToken: token });
    if (!activation) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Activation link is invalid or has expired' });
    }
    const profile = activation.pending_profile || {};
    const updated = await client.query(
      `UPDATE users SET name=$1,password=$2,avatar=$3,first_name=$4,last_name=$5,phone=$6,
       job_title=$7,company=$8,birth_date=$9,gender=$10,email_verified_at=NOW()
       WHERE id=$11 AND password IS NULL RETURNING id`,
      [profile.name, profile.passwordHash, profile.avatar, profile.firstName, profile.lastName,
       profile.phone || '', profile.jobTitle || '', profile.company || '', profile.birthDate || null,
       profile.gender || null, activation.user_id]
    );
    if (!updated.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Account is already active' });
    }
    await client.query('UPDATE account_activation_tokens SET used_at=NOW() WHERE id=$1', [activation.id]);
    await client.query(
      `INSERT INTO authentication_audit_events (id,user_id,event_type,ip_address,user_agent,request_id)
       VALUES ($1,$2,'legacy_account_activated',$3,$4,$5)`,
      [uuidv4(), activation.user_id, req.ip || null, req.headers['user-agent'] || null, req.requestId || null]
    );
    await client.query('COMMIT');
    await billingService.ensureSubscription(activation.user_id);
    return res.json({ success: true, message: 'Account activated. You can now sign in.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('account_activation_failed', { requestId: req.requestId, error: error.message });
    return res.status(500).json({ error: 'Unable to activate account' });
  } finally {
    client.release();
  }
});

router.post('/auth/verify-email', authRateLimit, async (req, res) => {
  const token = String(req.body?.token || '');
  if (!token) return res.status(400).json({ error: 'Verification token is required' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const verification = await consumeAccountToken(client, { table: 'email_verification_tokens', rawToken: token });
    if (!verification) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Verification link is invalid or has expired' });
    }
    await client.query('UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1', [verification.user_id]);
    await client.query('UPDATE email_verification_tokens SET used_at=NOW() WHERE id=$1', [verification.id]);
    await client.query('COMMIT');
    return res.json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ error: 'Unable to verify email' });
  } finally {
    client.release();
  }
});

router.post('/auth/resend-verification', passwordResetRateLimit, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const generic = { success: true, message: 'If verification is needed, a new link has been sent.' };
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address' });
  try {
    const result = await db.query('SELECT id,name,email,email_verified_at FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || user.email_verified_at) return res.json(generic);
    const verification = await replaceAccountToken(db, { table: 'email_verification_tokens', userId: user.id });
    const verificationUrl = `${publicAppUrl()}/verify-email?token=${encodeURIComponent(verification.rawToken)}`;
    await sendEmail({
      to: user.email, subject: 'Verify your Smart Manage email',
      text: `Verify your Smart Manage email: ${verificationUrl}. This link expires in 24 hours.`,
      html: buildAccountActionEmail({ displayName: user.name, actionUrl: verificationUrl }),
    });
    return res.json(generic);
  } catch (error) {
    logger.error('resend_verification_failed', { requestId: req.requestId, error: error.message });
    return res.json(generic);
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

    const configuredAppUrl = String(
      process.env.APP_URL
      || process.env.NEXT_PUBLIC_FRONTEND_URL
      || 'http://localhost:3000'
    );
    const appUrl = (
      process.env.NODE_ENV === 'production'
      && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredAppUrl)
        ? 'https://package-report.vercel.app'
        : configuredAppUrl
    ).replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const displayName = user.name || 'there';
    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your Smart Manage password',
        text: `Hi ${displayName}, reset your password using this link: ${resetUrl}. This link expires in 30 minutes.`,
        html: buildPasswordResetEmail({ displayName, resetUrl }),
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
    await revokeSessions(client, resetToken.user_id, { reason: 'password_reset' });
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
    await revokeSessions(db, req.user.id, { reason: 'password_change' });
    logger.info('password_changed', { requestId: req.requestId, userId: req.user.id });
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    logger.error('password_change_failed', { requestId: req.requestId, userId: req.user.id, error: err.message });
    return res.status(500).json({ error: 'Unable to update password' });
  }
});

module.exports = router;
