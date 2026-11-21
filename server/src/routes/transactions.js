import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate, authenticatePos, authorize } from '../middleware/auth.js';
import { createTransaction } from '../services/transactionService.js';
import { parseDateRange } from '../utils/dateRange.js';
import { validateTransactionPayload } from '../utils/transactionPayload.js';

const router = Router();

async function writeAudit(req, action, entityId, details = {}) {
  await pool.query(
    `INSERT INTO audit_events (actor_user_id, actor_email, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, 'transaction', $4, $5::jsonb)`,
    [req.user?.id ?? null, req.user?.email ?? null, action, String(entityId), JSON.stringify(details)]
  );
}

async function recordIntegrationEvent({ source, eventType, success, externalId, status, durationMs, errorMessage }) {
  try {
    await pool.query(
      `INSERT INTO integration_events
         (source, event_type, success, external_id, http_status, duration_ms, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [source, eventType, success, externalId || null, status, Math.max(0, durationMs), errorMessage || null]
    );
  } catch (error) {
    console.error('Failed to record POS integration event', error);
  }
}

async function ingest(req, res, next) {
  const startedAt = Date.now();
  const source = req.get('x-pos-api-key') ? 'pos-api' : 'dashboard-pos';
  const externalId = typeof req.body.externalId === 'string' ? req.body.externalId.trim().slice(0, 128) : null;
  try {
    const validationError = validateTransactionPayload(req.body);
    if (validationError) {
      await recordIntegrationEvent({
        source, eventType: 'transaction.rejected', success: false, externalId,
        status: 400, durationMs: Date.now() - startedAt, errorMessage: validationError
      });
      return res.status(400).json({ error: validationError });
    }
    let shiftId = null;
    if (req.user) {
      const activeShift = await pool.query(
        'SELECT id FROM cashier_shifts WHERE cashier_user_id = $1 AND closed_at IS NULL',
        [req.user.id]
      );
      if (!activeShift.rowCount && req.user.role === 'cashier') {
        const error = new Error('Open a cashier shift before completing a sale');
        error.status = 409;
        throw error;
      }
      shiftId = activeShift.rows[0]?.id ?? null;
    }
    const result = await createTransaction({
      externalId: req.body.externalId.trim(),
      occurredAt: new Date(req.body.occurredAt).toISOString(),
      processedByUserId: req.user?.id ?? null,
      paymentMethod: req.body.paymentMethod || 'cash',
      tendered: req.body.tendered ?? null,
      salesChannel: req.body.salesChannel || 'store',
      customerId: req.body.customerId === undefined || req.body.customerId === null
        ? null
        : Number(req.body.customerId),
      shiftId,
      items: req.body.items.map((item) => ({ productId: Number(item.productId), quantity: item.quantity }))
    });
    if (!result.duplicate) await writeAudit(req, 'transaction.created', result.transaction.id, {
      externalId: result.transaction.external_id,
      paymentMethod: result.transaction.payment_method,
      salesChannel: result.transaction.sales_channel,
      total: result.transaction.total
    });
    await recordIntegrationEvent({
      source,
      eventType: result.duplicate ? 'transaction.duplicate' : 'transaction.created',
      success: true,
      externalId,
      status: result.duplicate ? 200 : 201,
      durationMs: Date.now() - startedAt
    });
    res.status(result.duplicate ? 200 : 201).json({ transaction: result.transaction, duplicate: result.duplicate });
  } catch (error) {
    await recordIntegrationEvent({
      source, eventType: 'transaction.failed', success: false, externalId,
      status: Number.isInteger(error.status) ? error.status : 500,
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Transaction ingestion failed'
    });
    next(error);
  }
}

router.post('/ingest', authenticatePos, ingest);
router.post('/', authenticate, authorize('admin', 'cashier'), ingest);

router.post('/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const status = req.body.status;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid transaction id' });
    }
    if (!['voided', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'Status must be voided or refunded' });
    }
    if (['voided', 'refunded'].includes(status) && !reason) {
      return res.status(400).json({ error: 'A reason is required for void or refund' });
    }
    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT status FROM transactions WHERE id = $1 FOR UPDATE', [id]);
      if (!current.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Transaction not found' });
      }
      if (current.rows[0].status !== 'completed') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Only completed transactions can be voided or refunded' });
      }
      if (status === 'voided') {
        await client.query(
          `UPDATE products p
           SET stock_quantity = p.stock_quantity + restored.quantity, updated_at = NOW()
           FROM (
             SELECT product_id, SUM(quantity)::integer AS quantity
             FROM transaction_items WHERE transaction_id = $1 GROUP BY product_id
           ) restored
           WHERE p.id = restored.product_id`,
          [id]
        );
      }
      result = await client.query(
        `UPDATE transactions
         SET status = $1, status_reason = $2
         WHERE id = $3
         RETURNING id, external_id, occurred_at, status, total, payment_method, tendered, change_amount, sales_channel`,
        [status, reason || null, id]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    await writeAudit(req, `transaction.${status}`, id, { reason: reason || null });
    res.json({ transaction: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const rawLimit = req.query.limit === undefined ? 50 : Number(req.query.limit);
    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
      return res.status(400).json({ error: 'limit must be an integer from 1 to 100' });
    }
    const limit = rawLimit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 128) : '';
    const dateRange = parseDateRange(req.query);
    if (dateRange.error) return res.status(400).json({ error: dateRange.error });
    const result = await pool.query(
      `SELECT t.id, t.external_id, t.occurred_at, t.status, t.total,
              t.payment_method, t.tendered, t.change_amount, t.sales_channel,
              t.processed_by_user_id, c.name AS customer_name,
              COALESCE(SUM(ti.quantity), 0)::integer AS item_count
       FROM transactions t
       LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
       LEFT JOIN customers c ON c.id = t.customer_id
       WHERE ($1 = '' OR t.external_id ILIKE '%' || $1 || '%')
         AND ($2::timestamptz IS NULL OR t.occurred_at >= $2)
         AND ($3::timestamptz IS NULL OR t.occurred_at < $3)
         AND ($5::boolean OR t.processed_by_user_id = $6)
       GROUP BY t.id, c.name
       ORDER BY t.occurred_at DESC
       LIMIT $4`,
      [search, dateRange.from, dateRange.to, limit, req.user.role === 'admin', req.user.id]
    );
    res.json({ transactions: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid transaction id' });
    const transaction = await pool.query(
      `SELECT t.id, t.external_id, t.occurred_at, t.processed_by_user_id, t.status,
              t.total, t.payment_method, t.tendered, t.change_amount, t.sales_channel,
              t.status_reason, t.customer_id, c.name AS customer_name,
              c.email AS customer_email, c.phone AS customer_phone
       FROM transactions t
       LEFT JOIN customers c ON c.id = t.customer_id
       WHERE t.id = $1`,
      [id]
    );
    if (!transaction.rowCount) return res.status(404).json({ error: 'Transaction not found' });
    if (req.user.role !== 'admin' && String(transaction.rows[0].processed_by_user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You do not have permission to view this transaction' });
    }
    const items = await pool.query(
      `SELECT product_id, product_name, sku, quantity, unit_price, line_total
       FROM transaction_items WHERE transaction_id = $1 ORDER BY id`,
      [id]
    );
    res.json({ transaction: transaction.rows[0], items: items.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
