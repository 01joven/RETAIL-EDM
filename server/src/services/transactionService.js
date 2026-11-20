import { pool } from '../config/db.js';

function priceToCents(value) {
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function centsToPrice(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export async function createTransaction({
  externalId,
  occurredAt,
  items,
  processedByUserId = null,
  paymentMethod = 'cash',
  tendered = null,
  salesChannel = 'store',
  customerId = null,
  shiftId = null
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (shiftId !== null) {
      const shift = await client.query(
        `SELECT id FROM cashier_shifts
         WHERE id = $1 AND cashier_user_id = $2 AND closed_at IS NULL
         FOR UPDATE`,
        [shiftId, processedByUserId]
      );
      if (!shift.rowCount) {
        const error = new Error('The active shift has closed; open a new shift before completing a sale');
        error.status = 409;
        throw error;
      }
    }
    if (customerId !== null) {
      const customer = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
      if (!customer.rowCount) {
        const error = new Error('Customer was not found');
        error.status = 400;
        throw error;
      }
    }
    const transactionResult = await client.query(
      `INSERT INTO transactions
         (external_id, occurred_at, processed_by_user_id, payment_method, sales_channel, customer_id, shift_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (external_id) DO NOTHING
       RETURNING id, external_id, occurred_at, processed_by_user_id, status, total, payment_method, tendered, change_amount, sales_channel, customer_id, shift_id`,
      [externalId, occurredAt, processedByUserId, paymentMethod, salesChannel, customerId, shiftId]
    );
    if (!transactionResult.rowCount) {
      const existing = await client.query(
        'SELECT id, external_id, occurred_at, processed_by_user_id, status, total, payment_method, tendered, change_amount, sales_channel, customer_id, shift_id FROM transactions WHERE external_id = $1',
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
    const quantitiesByProduct = new Map();
    for (const item of items) {
      quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) || 0) + item.quantity);
    }
    for (const [productId, quantity] of quantitiesByProduct) {
      const productResult = await client.query(
        'SELECT id, sku, name, category, unit_price, stock_quantity FROM products WHERE id = $1 AND active = TRUE FOR UPDATE',
        [productId]
      );
      if (!productResult.rowCount) {
        const error = new Error(`Product ${productId} was not found or is inactive`);
        error.status = 400;
        throw error;
      }
      const product = productResult.rows[0];
      if (product.stock_quantity < quantity) {
        const error = new Error(`Insufficient stock for product ${product.sku}`);
        error.status = 409;
        throw error;
      }
      const priceCents = priceToCents(product.unit_price);
      const lineCents = priceCents * BigInt(quantity);
      totalCents += lineCents;
      if (totalCents > 999999999999n) {
        const error = new Error('Transaction total exceeds the supported maximum');
        error.status = 400;
        throw error;
      }
      savedItems.push({ product, quantity, priceCents, lineCents });
    }

    for (const { product, quantity, priceCents, lineCents } of savedItems) {
      await client.query(
        `INSERT INTO transaction_items
         (transaction_id, product_id, product_name, product_category, sku, quantity, unit_price, line_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [transaction.id, product.id, product.name, product.category, product.sku, quantity, centsToPrice(priceCents), centsToPrice(lineCents)]
      );
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2',
        [quantity, product.id]
      );
    }
    const tenderedCents = tendered === null ? totalCents : priceToCents(tendered);
    if (paymentMethod === 'cash' && tenderedCents < totalCents) {
      const error = new Error('Cash tendered is less than the transaction total');
      error.status = 400;
      throw error;
    }
    const changeCents = paymentMethod === 'cash' ? tenderedCents - totalCents : 0n;
    const updated = await client.query(
      `UPDATE transactions
       SET total = $1, tendered = $2, change_amount = $3
       WHERE id = $4
       RETURNING id, external_id, occurred_at, processed_by_user_id, status, total, payment_method, tendered, change_amount, sales_channel, customer_id, shift_id`,
      [centsToPrice(totalCents), centsToPrice(tenderedCents), centsToPrice(changeCents), transaction.id]
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
