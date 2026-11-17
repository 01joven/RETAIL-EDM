import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../config/db.js';
import { config } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/passwordResetService.js';
import { hashResetCode } from '../utils/passwordReset.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const recoveryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const recoveryMessage = 'If an account matches this email, we attempted to send a verification code. Check your inbox or contact your administrator.';

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password || email.length > 254 || password.length > 256) {
      return res.status(400).json({ error: 'A valid email and password are required' });
    }
    const result = await pool.query('SELECT id, email, password_hash, role, token_version FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) return res.status(401).json({ error: 'Email or password is incorrect' });
    const accessToken = jwt.sign(
      { sub: String(user.id), email: user.email, role: user.role, tokenVersion: user.token_version },
      config.jwtSecret,
      { expiresIn: '8h', issuer: 'retail-pos-api' }
    );
    return res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    return next(error);
  }
});

router.post('/forgot-password', recoveryLimiter, async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (!config.resendApiKey || !config.resendFromEmail) {
    return res.status(503).json({ error: 'Password recovery is not configured. Contact your system administrator.' });
  }

  try {
    const account = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (!account.rowCount) return res.status(202).json({ message: recoveryMessage });

    const user = account.rows[0];
    const client = await pool.connect();
    let transactionStarted = false;
    let resetId;
    let code;
    try {
      await client.query('BEGIN');
      transactionStarted = true;
      const lockedUser = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [user.id]);
      if (!lockedUser.rowCount) {
        await client.query('COMMIT');
        transactionStarted = false;
        return res.status(202).json({ message: recoveryMessage });
      }
      const recentCode = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM password_reset_codes
           WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 minute'
         ) AS requested_recently`,
        [user.id]
      );
      if (recentCode.rows[0].requested_recently) {
        await client.query('COMMIT');
        transactionStarted = false;
        return res.status(202).json({ message: recoveryMessage });
      }

      code = String(crypto.randomInt(100000, 1000000));
      await client.query(
        'UPDATE password_reset_codes SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );
      const inserted = await client.query(
        `INSERT INTO password_reset_codes (user_id, code_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
         RETURNING id`,
        [user.id, hashResetCode(user.id, code)]
      );
      resetId = inserted.rows[0].id;
      await client.query('COMMIT');
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    try {
      await sendPasswordResetEmail(user.email, code);
    } catch (error) {
      console.error('Password reset email delivery failed', { status: error.status || 'network error' });
      await pool.query(
        'UPDATE password_reset_codes SET used_at = NOW() WHERE id = $1 AND used_at IS NULL',
        [resetId]
      );
    }
    return res.status(202).json({ message: recoveryMessage });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', verifyLimiter, async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!isValidEmail(email) || !/^\d{6}$/.test(code) || password.length < 12 || password.length > 256) {
    return res.status(400).json({ error: 'Enter a valid email, six-digit code, and password of at least 12 characters' });
  }

  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const account = await client.query('SELECT id FROM users WHERE email = $1 FOR UPDATE', [email]);
    if (!account.rowCount) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({ error: 'Verification code is invalid or expired' });
    }
    const userId = account.rows[0].id;
    const reset = await client.query(
      `SELECT id, code_hash, attempts
       FROM password_reset_codes
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW() AND attempts < 5
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );
    if (!reset.rowCount) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({ error: 'Verification code is invalid or expired' });
    }

    const suppliedHash = Buffer.from(hashResetCode(userId, code), 'hex');
    const storedHash = Buffer.from(reset.rows[0].code_hash, 'hex');
    if (!crypto.timingSafeEqual(suppliedHash, storedHash)) {
      await client.query(
        `UPDATE password_reset_codes
         SET attempts = attempts + 1,
             used_at = CASE WHEN attempts + 1 >= 5 THEN NOW() ELSE used_at END
         WHERE id = $1`,
        [reset.rows[0].id]
      );
      await client.query('COMMIT');
      transactionStarted = false;
      return res.status(400).json({ error: 'Verification code is invalid or expired' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(
      'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2',
      [passwordHash, userId]
    );
    await client.query(
      'UPDATE password_reset_codes SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );
    await client.query('COMMIT');
    transactionStarted = false;
    return res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: { id: req.user.sub, email: req.user.email, role: req.user.role } });
});

export default router;
