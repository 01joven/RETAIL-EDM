import { pool } from '../config/db.js';

const catalog = [
  ['SKU-RICE-001', 'Sinandomeng Rice (1kg)', 55.00, 100],
  ['SKU-RICE-002', 'Jasmine Rice (1kg)', 70.00, 80],
  ['SKU-RICE-003', 'Dinorado Rice (1kg)', 65.00, 90],
  ['SKU-RICE-004', 'Monggo Beans (500g)', 60.00, 70],
  ['SKU-RICE-005', 'Pancit Canton', 15.00, 160],
  ['SKU-RICE-006', 'Spaghetti Pasta (400g)', 48.00, 75],
  ['SKU-RICE-007', 'Elbow Macaroni (400g)', 42.00, 68],
  ['SKU-RICE-008', 'Corned Beef 150g', 38.00, 120],
  ['SKU-RICE-009', 'Beef Loaf 150g', 25.00, 105],
  ['SKU-RICE-010', 'Canned Tuna 180g', 35.00, 95],
  ['SKU-RICE-011', 'Sardines in Tomato Sauce', 24.00, 140],
  ['SKU-RICE-012', 'Lucky Me Pancit Canton', 12.00, 200],

  ['SKU-DRNK-001', 'Coca-Cola 1L', 42.00, 90],
  ['SKU-DRNK-002', 'Royal Orange 1L', 42.00, 85],
  ['SKU-DRNK-003', 'Sprite 1L', 42.00, 80],
  ['SKU-DRNK-004', 'Bottled Water 500ml', 15.00, 180],
  ['SKU-DRNK-005', 'Energen Chocolate', 12.00, 150],
  ['SKU-DRNK-006', 'Bear Brand Milk 150g', 25.00, 110],
  ['SKU-DRNK-007', 'Alaska Evaporada 370ml', 33.00, 85],
  ['SKU-DRNK-008', 'Nescafe 3in1 Sachet', 10.00, 240],
  ['SKU-DRNK-009', 'Lipton Iced Tea 500ml', 35.00, 75],
  ['SKU-DRNK-010', 'Gulaman 200ml', 18.00, 100],

  ['SKU-SNCK-001', 'Oishi Prawn Crackers', 12.00, 170],
  ['SKU-SNCK-002', 'Piattos Cheese', 20.00, 130],
  ['SKU-SNCK-003', 'Nova Country Cheddar', 20.00, 125],
  ['SKU-SNCK-004', 'Chippy BBQ', 15.00, 145],
  ['SKU-SNCK-005', 'Skyflakes Crackers', 8.00, 190],
  ['SKU-SNCK-006', 'Hansel Mocha Biscuits', 12.00, 155],
  ['SKU-SNCK-007', 'Cream-O Chocolate', 18.00, 115],
  ['SKU-SNCK-008', 'Mr. Chips', 18.00, 135],
  ['SKU-SNCK-009', 'Boy Bawang Cornick', 12.00, 160],
  ['SKU-SNCK-010', 'Good Day Choco Bar', 10.00, 140],
  ['SKU-SNCK-011', 'Fita Crackers', 9.00, 120],
  ['SKU-SNCK-012', 'Rebisco Sandwich Cracker', 8.00, 150],

  ['SKU-HHLD-001', 'Modess Sanitary Napkin', 20.00, 70],
  ['SKU-HHLD-002', 'Johnson Baby Powder 50g', 25.00, 55],
  ['SKU-HHLD-003', 'Rexona Roll-On', 55.00, 40],
  ['SKU-HHLD-004', 'Close-Up Toothpaste', 16.00, 90],
  ['SKU-HHLD-005', 'Colgate Total Toothpaste 20g', 18.00, 100],
  ['SKU-HHLD-006', 'Sunsilk Shampoo Sachet', 7.00, 160],
  ['SKU-HHLD-007', 'Head & Shoulders 12ml', 8.00, 150],
  ['SKU-HHLD-008', 'Palmolive Naturals Soap', 30.00, 65],
  ['SKU-HHLD-009', 'Safeguard Soap 130g', 45.00, 70],
  ['SKU-HHLD-010', 'Dishwashing Liquid 250ml', 35.00, 95],
  ['SKU-HHLD-011', 'Trash Bag Roll (Medium)', 10.00, 100],
  ['SKU-HHLD-012', 'Champion Detergent Bar', 15.00, 80],
  ['SKU-HHLD-013', 'Baygon Insect Spray', 120.00, 20],
  ['SKU-HHLD-014', 'Domex Toilet Bowl Cleaner', 40.00, 30],
  ['SKU-HHLD-015', 'Zonrox Bleach 250ml', 25.00, 50],
  ['SKU-HHLD-016', 'Tissue Roll', 22.00, 75],
  ['SKU-HHLD-017', 'Bath Soap 75g', 18.00, 100],
  ['SKU-HHLD-018', 'Cotton Buds', 28.00, 60],

  ['SKU-FRSH-001', 'Fresh Eggs (Piece)', 9.00, 180],
  ['SKU-FRSH-002', 'Cooking Oil 1L', 95.00, 55],
  ['SKU-FRSH-003', 'Bread Loaf', 60.00, 35],
  ['SKU-FRSH-004', 'White Sugar 1kg', 72.00, 65],
  ['SKU-FRSH-005', 'Brown Sugar 1kg', 68.00, 60],
  ['SKU-FRSH-006', 'Coffee Creamer 500g', 85.00, 45],
  ['SKU-FRSH-007', 'Soy Sauce 350ml', 28.00, 95],
  ['SKU-FRSH-008', 'Vinegar 350ml', 24.00, 90],
  ['SKU-FRSH-009', 'Fish Sauce 350ml', 29.00, 88],
  ['SKU-FRSH-010', 'Salt 500g', 18.00, 120],
  ['SKU-FRSH-011', 'All-Purpose Flour 1kg', 48.00, 70],
  ['SKU-FRSH-012', 'Condensed Milk 300ml', 42.00, 80]
];

const categories = {
  RICE: 'Groceries',
  DRNK: 'Beverages',
  SNCK: 'Snacks',
  HHLD: 'Household & Personal Care',
  FRSH: 'Pantry & Fresh'
};

try {
  let inserted = 0;
  let categorized = 0;
  let unchanged = 0;
  for (const [sku, name, unitPrice, stockQuantity] of catalog) {
    const category = categories[sku.split('-')[1]] || 'Uncategorized';
    const existing = await pool.query('SELECT category FROM products WHERE sku = $1', [sku]);
    if (existing.rowCount) {
      if (existing.rows[0].category === 'Uncategorized') {
        await pool.query(
          "UPDATE products SET category = $1, updated_at = NOW() WHERE sku = $2",
          [category, sku]
        );
        categorized += 1;
      } else {
        unchanged += 1;
      }
      continue;
    }
    const result = await pool.query(
      `INSERT INTO products (sku, name, category, unit_price, stock_quantity, active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (sku) DO NOTHING`,
      [sku, name, category, unitPrice.toFixed(2), stockQuantity]
    );
    if (result.rowCount) inserted += 1;
    else unchanged += 1;
  }
  const historical = await pool.query(
    `UPDATE transaction_items ti
     SET product_category = p.category
     FROM products p
     WHERE ti.product_id = p.id AND ti.product_category = 'Uncategorized'`
  );
  console.log(`Product catalog seeded: ${inserted} inserted, ${categorized} categorized, ${unchanged} unchanged; ${historical.rowCount} historical item rows categorized`);
} catch (error) {
  console.error('Product seed failed', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
