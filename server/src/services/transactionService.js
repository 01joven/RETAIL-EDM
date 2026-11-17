import { pool } from '../config/db.js';

function priceToCents(value) {
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function centsToPrice(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export async function createTransaction({ externalId, occurredAt, items, processedByUserId = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const transactionResult = await client.query(
      `INSERT INTO transactions (external_id, occurred_at, processed_by_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (external_id) DO NOTHING
       RETURNING id, external_id, occurred_at, processed_by_user_id, status, total`,
      [externalId, occurredAt, processedByUserId]
    );
    if (!transactionResult.rowCount) {
      const existing = await client.query(
        'SELECT id, external_id, occurred_at, processed_by_user_id, status, total FROM transactions WHERE external_id = $1',
        [externalId]
      );
      if (processedByUserId !== null && String(existing.rows[0].processed_by_user_id) !== String(processedByUserId)) {
        const error = new Error('POS reference already belongs to another transaction');
        error.status = 409;
        throw error;
      }
      await client.query('COMMIT');
      return { transaction: existing.rows[0], duplicate: true };
    }

    const transaction = transactionResult.rows[0];
    let totalCents = 0n;
    const savedItems = [];
    for (const item of items) {
      const productResult = await client.query(
        'SELECT id, sku, name, unit_price, stock_quantity FROM products WHERE id = $1 AND active = TRUE FOR UPDATE',
        [item.productId]
      );
      if (!productResult.rowCount) {
        const error = new Error(`Product ${item.productId} was not found or is inactive`);
        error.status = 400;
        throw error;
      }
      const product = productResult.rows[0];
      if (product.stock_quantity < item.quantity) {
        const error = new Error(`Insufficient stock for product ${product.sku}`);
        error.status = 409;
        throw error;
      }
      const priceCents = priceToCents(product.unit_price);
      const lineCents = priceCents * BigInt(item.quantity);
      totalCents += lineCents;
      if (totalCents > 999999999999n) {
        const error = new Error('Transaction total exceeds the supported maximum');
        error.status = 400;
        throw error;
      }
      savedItems.push({ product, item, priceCents, lineCents });
    }

    for (const { product, item, priceCents, lineCents } of savedItems) {
      await client.query(
        `INSERT INTO transaction_items
           (transaction_id, product_id, product_name, sku, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [transaction.id, product.id, product.name, product.sku, item.quantity, centsToPrice(priceCents), centsToPrice(lineCents)]
      );
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, product.id]
      );
    }
    const updated = await client.query(
      'UPDATE transactions SET total = $1 WHERE id = $2 RETURNING id, external_id, occurred_at, processed_by_user_id, status, total',
      [centsToPrice(totalCents), transaction.id]
    );
    await client.query('COMMIT');
    return { transaction: updated.rows[0], duplicate: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
