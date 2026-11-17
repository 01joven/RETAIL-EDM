import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('admin'));

function validEmail(value) {
  return typeof value === 'string' && value.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    if (!validEmail(email) || typeof password !== 'string' || password.length < 12 ||
        password.length > 256 || (role !== undefined && role !== 'cashier')) {
      return res.status(400).json({
        error: 'Provide a valid email and password of at least 12 characters; only cashier accounts can be created'
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'cashier')
       RETURNING id, email, role, created_at`,
      [email.trim().toLowerCase(), passwordHash]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email is already registered' });
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    const id = Number(req.params.id);
    const { email, password, role } = req.body;
    if (!Number.isSafeInteger(id) || id < 1 ||
        (email !== undefined && !validEmail(email)) ||
        (password !== undefined && (typeof password !== 'string' || password.length < 12 || password.length > 256)) ||
        (role !== undefined && role !== 'cashier') ||
        (email === undefined && password === undefined && role === undefined)) {
      return res.status(400).json({ error: 'Provide a valid user id and at least one valid field to update' });
    }
    if (id === Number(req.user.id) && role !== undefined) {
      return res.status(403).json({ error: 'You cannot change your own role' });
    }

    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
    const target = await client.query('SELECT id, role FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!target.rowCount) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.rows[0].role === 'admin' && role === 'cashier') {
      const admins = await client.query("SELECT COUNT(*)::integer AS count FROM users WHERE role = 'admin'");
      if (admins.rows[0].count <= 1) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(409).json({ error: 'The last admin account cannot be changed to cashier' });
      }
    }

    const passwordHash = password === undefined ? null : await bcrypt.hash(password, 12);
    const updated = await client.query(
      `UPDATE users
       SET email = COALESCE($2, email),
           password_hash = COALESCE($3, password_hash),
           role = COALESCE($4, role),
           token_version = token_version + CASE WHEN $3::text IS NULL THEN 0 ELSE 1 END
       WHERE id = $1
       RETURNING id, email, role, created_at`,
      [id, email === undefined ? null : email.trim().toLowerCase(), passwordHash, role ?? null]
    );
    await client.query('COMMIT');
    transactionStarted = false;
    res.json({ user: updated.rows[0] });
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'Email is already registered' });
    next(error);
  } finally {
    client?.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid user id' });
    if (id === Number(req.user.id)) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
    const target = await client.query('SELECT id, role FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!target.rowCount) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.rows[0].role === 'admin') {
      const admins = await client.query("SELECT COUNT(*)::integer AS count FROM users WHERE role = 'admin'");
      if (admins.rows[0].count <= 1) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(409).json({ error: 'The last admin account cannot be deleted' });
      }
    }
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    await client.query('COMMIT');
    transactionStarted = false;
    res.status(204).end();
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    next(error);
  } finally {
    client?.release();
  }
});

export default router;
