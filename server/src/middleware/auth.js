import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { pool } from '../config/db.js';

export async function authenticate(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  let claims;
  try {
    claims = jwt.verify(token, config.jwtSecret, { issuer: 'retail-pos-api' });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
  try {
    const user = await pool.query(
      'SELECT id, email, role, token_version FROM users WHERE id = $1 AND role IN (\'admin\', \'cashier\')',
      [claims.sub]
    );
    if (!user.rowCount) return res.status(401).json({ error: 'Account is no longer available' });
    if (claims.tokenVersion !== user.rows[0].token_version) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = {
      id: user.rows[0].id,
      sub: String(user.rows[0].id),
      email: user.rows[0].email,
      role: user.rows[0].role
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    return next();
  };
}

export function authenticatePos(req, res, next) {
  const provided = req.get('x-pos-api-key') || '';
  const expected = config.posApiKey;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Invalid POS integration credentials' });
  }
  return next();
}
