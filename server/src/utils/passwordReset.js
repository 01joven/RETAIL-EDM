import crypto from 'node:crypto';
import { config } from '../config/env.js';

export function hashResetCode(userId, code) {
  return crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${userId}:${code}`)
    .digest('hex');
}
