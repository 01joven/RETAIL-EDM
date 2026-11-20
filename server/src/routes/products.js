import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, sku, name, category, unit_price, active, stock_quantity
       FROM products
       WHERE ($1::boolean OR active = TRUE)
       ORDER BY name`,
      [req.user.role === 'admin']
    );
    res.json({ products: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { sku, name, category = 'Uncategorized', unitPrice, stockQuantity = 0 } = req.body;
    if (typeof sku !== 'string' || !sku.trim() || sku.trim().length > 64 ||
        typeof name !== 'string' || !name.trim() || name.trim().length > 160 ||
        typeof category !== 'string' || !category.trim() || category.trim().length > 80 ||
        !Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0 || Number(unitPrice) > 9999999999.99 ||
        !/^\d+(\.\d{1,2})?$/.test(String(unitPrice)) ||
        !Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 2147483647) {
      return res.status(400).json({ error: 'Valid SKU, name, price, and non-negative integer stock are required' });
    }
    const result = await pool.query(
      `INSERT INTO products (sku, name, category, unit_price, stock_quantity)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, sku, name, category, unit_price, stock_quantity, active`,
      [sku.trim(), name.trim(), category.trim(), Number(unitPrice).toFixed(2), stockQuantity]
    );
    res.status(201).json({ product: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    next(error);
  }
});

router.patch('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { sku, name, category, unitPrice, active, stockQuantity } = req.body;
    if (!Number.isSafeInteger(id) || id < 1 ||
        (sku !== undefined && (typeof sku !== 'string' || !sku.trim() || sku.trim().length > 64)) ||
        (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 160)) ||
        (category !== undefined && (typeof category !== 'string' || !category.trim() || category.trim().length > 80)) ||
        (unitPrice !== undefined && (!/^\d+(\.\d{1,2})?$/.test(String(unitPrice)) ||
          Number(unitPrice) < 0 || Number(unitPrice) > 9999999999.99)) ||
        (active !== undefined && typeof active !== 'boolean') ||
        (stockQuantity !== undefined && (!Number.isInteger(stockQuantity) ||
          stockQuantity < 0 || stockQuantity > 2147483647)) ||
        (sku === undefined && name === undefined && category === undefined && unitPrice === undefined && active === undefined && stockQuantity === undefined)) {
      return res.status(400).json({ error: 'Provide a valid product id and at least one valid field to update' });
    }
    const result = await pool.query(
      `UPDATE products
       SET sku = COALESCE($2, sku),
           name = COALESCE($3, name),
           category = COALESCE($4, category),
           unit_price = COALESCE($5, unit_price),
           active = COALESCE($6, active),
           stock_quantity = COALESCE($7, stock_quantity),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, sku, name, category, unit_price, stock_quantity, active`,
      [id, sku === undefined ? null : sku.trim(), name === undefined ? null : name.trim(),
        category === undefined ? null : category.trim(), unitPrice === undefined ? null : Number(unitPrice).toFixed(2),
        active ?? null, stockQuantity ?? null]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    next(error);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid product id' });
    const result = await pool.query(
      `UPDATE products SET active = FALSE, updated_at = NOW()
       WHERE id = $1 AND active = TRUE
       RETURNING id`,
      [id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Active product not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
