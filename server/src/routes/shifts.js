import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cashDifference, expectedCash, isValidMoney } from '../utils/shiftMetrics.js';

const router = Router();
const defaultOpeningFloat = 10;

router.use(authenticate, authorize('admin', 'cashier'));

async function getShiftSummary(db, shift, user) {
  const result = await db.query(
    `WITH business_day AS (
       SELECT date_trunc('day', NOW() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila' AS starts_at
     )
     SELECT
       COALESCE(SUM(total) FILTER (WHERE payment_method = 'cash' AND status = 'completed' AND shift_id = $1::bigint), 0)::text AS cash_sales,
       COALESCE(SUM(total) FILTER (WHERE payment_method = 'gcash' AND status = 'completed' AND shift_id = $1::bigint), 0)::text AS gcash_sales,
       COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND occurred_at >= business_day.starts_at
         AND occurred_at < business_day.starts_at + INTERVAL '1 day'
         AND ($2::boolean OR processed_by_user_id = $3)), 0)::text AS daily_sales,
       COALESCE(SUM(total) FILTER (WHERE payment_method = 'cash' AND status = 'completed'
         AND occurred_at >= business_day.starts_at AND occurred_at < business_day.starts_at + INTERVAL '1 day'
         AND ($2::boolean OR processed_by_user_id = $3)), 0)::text AS daily_cash_sales,
       COALESCE(SUM(total) FILTER (WHERE payment_method = 'gcash' AND status = 'completed'
         AND occurred_at >= business_day.starts_at AND occurred_at < business_day.starts_at + INTERVAL '1 day'
         AND ($2::boolean OR processed_by_user_id = $3)), 0)::text AS daily_gcash_sales,
       COUNT(*) FILTER (WHERE status = 'completed' AND occurred_at >= business_day.starts_at
         AND occurred_at < business_day.starts_at + INTERVAL '1 day'
         AND ($2::boolean OR processed_by_user_id = $3))::integer AS daily_transactions
     FROM transactions
     CROSS JOIN business_day
     WHERE ($1::bigint IS NOT NULL AND shift_id = $1::bigint)
        OR (occurred_at >= business_day.starts_at
          AND occurred_at < business_day.starts_at + INTERVAL '1 day'
          AND ($2::boolean OR processed_by_user_id = $3))`,
    [shift?.id ?? null, user.role === 'admin', user.id]
  );
  const totals = result.rows[0];
  return {
    shift: shift ? {
      id: shift.id,
      opened_at: shift.opened_at,
      opening_float: shift.opening_float
    } : null,
    totals: shift ? {
      cash_sales: totals.cash_sales,
      gcash_sales: totals.gcash_sales,
      expected_cash: expectedCash(shift.opening_float, totals.cash_sales)
    } : null,
    dailyTotals: {
      sales: totals.daily_sales,
      cash_sales: totals.daily_cash_sales,
      gcash_sales: totals.daily_gcash_sales,
      transactions: totals.daily_transactions
    }
  };
}

router.get('/current', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, opened_at, opening_float::text AS opening_float
       FROM cashier_shifts
       WHERE cashier_user_id = $1 AND closed_at IS NULL`,
      [req.user.id]
    );
    res.json(await getShiftSummary(pool, result.rows[0] || null, req.user));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const openingFloat = req.body.openingFloat === undefined
    ? defaultOpeningFloat
    : req.body.openingFloat;
  if (!isValidMoney(openingFloat)) {
    return res.status(400).json({ error: 'openingFloat must be a non-negative amount with up to two decimals' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO cashier_shifts (cashier_user_id, opening_float)
       VALUES ($1, $2)
       ON CONFLICT (cashier_user_id) WHERE closed_at IS NULL DO NOTHING
       RETURNING id, opened_at, opening_float::text AS opening_float`,
      [req.user.id, openingFloat.toFixed(2)]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A shift is already active for this cashier' });
    }
    const shift = result.rows[0];
    await client.query(
      `INSERT INTO audit_events (actor_user_id, actor_email, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'shift.opened', 'cashier_shift', $3, $4::jsonb)`,
      [req.user.id, req.user.email, String(shift.id), JSON.stringify({ openingFloat: shift.opening_float })]
    );
    await client.query('COMMIT');
    res.status(201).json(await getShiftSummary(pool, shift, req.user));
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    next(error);
  } finally {
    client?.release();
  }
});

router.post('/:id/close', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid shift id' });
  }
  const closingCash = req.body.closingCash;
  if (!isValidMoney(closingCash)) {
    return res.status(400).json({ error: 'closingCash must be a non-negative amount with up to two decimals' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, opened_at, opening_float::text AS opening_float
       FROM cashier_shifts
       WHERE id = $1 AND cashier_user_id = $2 AND closed_at IS NULL
       FOR UPDATE`,
      [id, req.user.id]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active shift not found' });
    }

    const summary = await getShiftSummary(client, result.rows[0], req.user);
    const difference = cashDifference(closingCash.toFixed(2), summary.totals.expected_cash);
    const closed = await client.query(
      `UPDATE cashier_shifts
       SET closed_at = NOW(), closing_cash = $1, cash_difference = $2
       WHERE id = $3
       RETURNING id, opened_at, opening_float::text AS opening_float,
                 closed_at, closing_cash::text AS closing_cash,
                 cash_difference::text AS cash_difference`,
      [closingCash.toFixed(2), difference, id]
    );
    await client.query(
      `INSERT INTO audit_events (actor_user_id, actor_email, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'shift.closed', 'cashier_shift', $3, $4::jsonb)`,
      [req.user.id, req.user.email, String(id), JSON.stringify({
        ...summary.totals,
        closing_cash: closingCash.toFixed(2),
        cash_difference: difference
      })]
    );
    await client.query('COMMIT');
    res.json({ shift: closed.rows[0], totals: summary.totals, dailyTotals: summary.dailyTotals });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    next(error);
  } finally {
    client?.release();
  }
});

export default router;
