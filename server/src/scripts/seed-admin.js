import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { config } from '../config/env.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in server/.env');
  process.exitCode = 1;
} else {
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, hash]
    );
    console.log(result.rowCount ? `Created admin user ${email}` : `Admin user ${email} already exists`);
  } catch (error) {
    console.error('Admin user creation failed', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
