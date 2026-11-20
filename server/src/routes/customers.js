import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('admin', 'cashier'));

router.get('/', async (req, res, next) => {
  try {
    const rawLimit = req.query.limit === undefined ? 100 : Number(req.query.limit);
    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
      return res.status(400).json({ error: 'limit must be an integer from 1 to 100' });
    }
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 120) : '';
    const result = await pool.query(
      `SELECT id, name, email, phone, created_at
       FROM customers
       WHERE ($1 = '' OR name ILIKE '%' || $1 || '%'
              OR COALESCE(email, '') ILIKE '%' || $1 || '%'
              OR COALESCE(phone, '') ILIKE '%' || $1 || '%')
       ORDER BY name, id
       LIMIT $2`,
      [search, rawLimit]
    );
    res.json({ customers: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const hasEmail = req.body.email !== undefined && req.body.email !== null;
    const hasPhone = req.body.phone !== undefined && req.body.phone !== null;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    if (!name || name.length > 120 ||
        (hasEmail && typeof req.body.email !== 'string') ||
        (hasPhone && typeof req.body.phone !== 'string') ||
        (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
        phone.length > 32) {
      return res.status(400).json({ error: 'Provide a customer name and valid optional email and phone' });
    }
    const result = await pool.query(
      `INSERT INTO customers (name, email, phone)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, phone, created_at`,
      [name, email || null, phone || null]
    );
    res.status(201).json({ customer: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
