import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate, authenticatePos, authorize } from '../middleware/auth.js';
import { createTransaction } from '../services/transactionService.js';
import { parseDateRange } from '../utils/dateRange.js';

const router = Router();

function validatePayload(body) {
  const { externalId, occurredAt, items } = body;
  if (typeof externalId !== 'string' || !externalId.trim() || externalId.length > 128 ||
      typeof occurredAt !== 'string' || Number.isNaN(Date.parse(occurredAt)) ||
      !Array.isArray(items) || items.length < 1 || items.length > 100) {
    return 'A POS reference, valid timestamp, and 1-100 items are required';
  }
  for (const item of items) {
    if (!item || typeof item !== 'object' ||
        !Number.isSafeInteger(Number(item.productId)) || Number(item.productId) < 1 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) {
      return 'Each item must include a valid product id and quantity from 1 to 10000';
    }
  }
  return null;
}

async function ingest(req, res, next) {
  try {
    const validationError = validatePayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    const result = await createTransaction({
      externalId: req.body.externalId.trim(),
      occurredAt: new Date(req.body.occurredAt).toISOString(),
      processedByUserId: req.user?.id ?? null,
      items: req.body.items.map((item) => ({ productId: Number(item.productId), quantity: item.quantity }))
    });
    res.status(result.duplicate ? 200 : 201).json({ transaction: result.transaction, duplicate: result.duplicate });
  } catch (error) {
    next(error);
  }
}

router.post('/ingest', authenticatePos, ingest);
router.post('/', authenticate, authorize('admin', 'cashier'), ingest);

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
              t.processed_by_user_id,
              COALESCE(SUM(ti.quantity), 0)::integer AS item_count
       FROM transactions t
       LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
       WHERE ($1 = '' OR t.external_id ILIKE '%' || $1 || '%')
         AND ($2::timestamptz IS NULL OR t.occurred_at >= $2)
         AND ($3::timestamptz IS NULL OR t.occurred_at < $3)
         AND ($5::boolean OR t.processed_by_user_id = $6)
       GROUP BY t.id
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
      'SELECT id, external_id, occurred_at, processed_by_user_id, status, total FROM transactions WHERE id = $1',
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
