import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { parseDateRange } from '../utils/dateRange.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/sales', async (req, res, next) => {
  try {
    const period = req.query.period || 'daily';
    const periods = { daily: 'day', weekly: 'week', monthly: 'month' };
    if (!Object.prototype.hasOwnProperty.call(periods, period)) {
      return res.status(400).json({ error: 'period must be daily, weekly, or monthly' });
    }
    const dateRange = parseDateRange(req.query);
    if (dateRange.error) return res.status(400).json({ error: dateRange.error });
    const result = await pool.query(
      `SELECT date_trunc($1, occurred_at) AS period_start,
              COUNT(*)::integer AS transactions,
              COALESCE(SUM(total), 0)::numeric(12, 2) AS sales
       FROM transactions
       WHERE status = 'completed'
         AND ($2::timestamptz IS NULL OR occurred_at >= $2)
         AND ($3::timestamptz IS NULL OR occurred_at < $3)
       GROUP BY 1
       ORDER BY 1`,
      [periods[period], dateRange.from, dateRange.to]
    );
    const summary = await pool.query(
      `SELECT COUNT(*)::integer AS transactions,
              COALESCE(SUM(total), 0)::numeric(12, 2) AS sales,
              COALESCE(AVG(total), 0)::numeric(12, 2) AS average_order_value
       FROM transactions
       WHERE status = 'completed'
         AND ($1::timestamptz IS NULL OR occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR occurred_at < $2)`,
      [dateRange.from, dateRange.to]
    );
    res.json({ period, summary: summary.rows[0], buckets: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
