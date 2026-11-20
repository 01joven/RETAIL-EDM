import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { parseDateRange } from '../utils/dateRange.js';
import { calculateSalesMetrics } from '../utils/salesMetrics.js';

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
    const topProducts = await pool.query(
      `SELECT ti.product_name AS name,
              SUM(ti.quantity)::integer AS units,
              COALESCE(SUM(ti.line_total), 0)::numeric(12,2) AS sales
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.status = 'completed'
         AND ($1::timestamptz IS NULL OR t.occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR t.occurred_at < $2)
       GROUP BY ti.product_name
       ORDER BY sales DESC
       LIMIT 8`,
      [dateRange.from, dateRange.to]
    );
    const paymentMethods = await pool.query(
      `SELECT payment_method,
              COUNT(*)::integer AS transactions,
              COALESCE(SUM(total), 0)::numeric(12,2) AS sales
       FROM transactions
       WHERE status = 'completed'
         AND ($1::timestamptz IS NULL OR occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR occurred_at < $2)
       GROUP BY payment_method
       ORDER BY sales DESC`,
      [dateRange.from, dateRange.to]
    );
    const exceptions = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'voided')::integer AS voided,
         COUNT(*) FILTER (WHERE status = 'refunded')::integer AS refunded,
         COALESCE(SUM(total) FILTER (WHERE status = 'voided'), 0)::numeric(12,2) AS voided_sales,
         COALESCE(SUM(total) FILTER (WHERE status = 'refunded'), 0)::numeric(12,2) AS refunded_sales
       FROM transactions
       WHERE ($1::timestamptz IS NULL OR occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR occurred_at < $2)`,
      [dateRange.from, dateRange.to]
    );
    const hourly = await pool.query(
      `SELECT EXTRACT(HOUR FROM occurred_at)::integer AS hour,
              COUNT(*)::integer AS transactions,
              COALESCE(SUM(total), 0)::numeric(12,2) AS sales
       FROM transactions
       WHERE status = 'completed'
         AND ($1::timestamptz IS NULL OR occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR occurred_at < $2)
       GROUP BY EXTRACT(HOUR FROM occurred_at)
       ORDER BY hour`,
      [dateRange.from, dateRange.to]
    );
    const categories = await pool.query(
      `SELECT ti.product_category AS category,
              SUM(ti.quantity)::integer AS units,
              COALESCE(SUM(ti.line_total), 0)::numeric(12,2) AS sales
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.status = 'completed'
         AND ($1::timestamptz IS NULL OR t.occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR t.occurred_at < $2)
       GROUP BY ti.product_category
       ORDER BY sales DESC`,
      [dateRange.from, dateRange.to]
    );
    const channels = await pool.query(
      `SELECT sales_channel,
              COUNT(*)::integer AS transactions,
              COALESCE(SUM(total), 0)::numeric(12,2) AS sales
       FROM transactions
       WHERE status = 'completed'
         AND ($1::timestamptz IS NULL OR occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR occurred_at < $2)
       GROUP BY sales_channel
       ORDER BY sales DESC`,
      [dateRange.from, dateRange.to]
    );
    const financials = await pool.query(
      `SELECT
         COALESCE(SUM(total) FILTER (WHERE status IN ('completed', 'refunded')), 0)::numeric(12,2) AS gross_sales,
         COALESCE(SUM(total) FILTER (WHERE status = 'refunded'), 0)::numeric(12,2) AS refunded_sales,
         COALESCE(SUM(total) FILTER (WHERE status = 'voided'), 0)::numeric(12,2) AS voided_sales
       FROM transactions
       WHERE ($1::timestamptz IS NULL OR occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR occurred_at < $2)`,
      [dateRange.from, dateRange.to]
    );
    const units = await pool.query(
      `SELECT COALESCE(SUM(ti.quantity), 0)::integer AS units_sold
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.status = 'completed'
         AND ($1::timestamptz IS NULL OR t.occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR t.occurred_at < $2)`,
      [dateRange.from, dateRange.to]
    );
    const salesMetrics = calculateSalesMetrics({
      completedSales: summary.rows[0].sales,
      refundedSales: financials.rows[0].refunded_sales,
      voidedSales: financials.rows[0].voided_sales
    });
    res.json({
      period,
      summary: summary.rows[0],
      ...salesMetrics,
      unitsSold: units.rows[0].units_sold,
      buckets: result.rows,
      topProducts: topProducts.rows,
      paymentMethods: paymentMethods.rows,
      exceptions: exceptions.rows[0],
      hourly: hourly.rows,
      categories: categories.rows,
      channels: channels.rows,
      financials: financials.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
