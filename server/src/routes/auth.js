import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../config/db.js';
import { config } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password || email.length > 254 || password.length > 256) {
      return res.status(400).json({ error: 'A valid email and password are required' });
    }
    const result = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) return res.status(401).json({ error: 'Email or password is incorrect' });
    const accessToken = jwt.sign(
      { sub: String(user.id), email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '8h', issuer: 'retail-pos-api' }
    );
    return res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: { id: req.user.sub, email: req.user.email, role: req.user.role } });
});

export default router;
