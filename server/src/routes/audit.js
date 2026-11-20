import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, occurred_at, actor_email, action, entity_type, entity_id, details
       FROM audit_events
       ORDER BY occurred_at DESC
       LIMIT 200`
    );
    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
