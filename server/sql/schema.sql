CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  token_version INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'users'::regclass AND conname = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'cashier'));
  END IF;
END
$migration$;

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash CHAR(64) NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS password_reset_codes_user_created_idx
  ON password_reset_codes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Uncategorized';

CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cashier_shifts (
  id BIGSERIAL PRIMARY KEY,
  cashier_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opening_float NUMERIC(12, 2) NOT NULL DEFAULT 10 CHECK (opening_float >= 0),
  closed_at TIMESTAMPTZ,
  closing_cash NUMERIC(12, 2) CHECK (closing_cash >= 0),
  cash_difference NUMERIC,
  CHECK (closed_at IS NULL OR closed_at >= opened_at),
  CHECK (
    (closed_at IS NULL AND closing_cash IS NULL AND cash_difference IS NULL)
    OR (closed_at IS NOT NULL AND closing_cash IS NOT NULL AND cash_difference IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS cashier_shifts_one_active_per_cashier_idx
  ON cashier_shifts (cashier_user_id)
  WHERE closed_at IS NULL;

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL,
  processed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  shift_id BIGINT REFERENCES cashier_shifts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'refunded')),
  total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash'
  CHECK (payment_method IN ('cash', 'gcash'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tendered NUMERIC(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS change_amount NUMERIC(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sales_channel TEXT NOT NULL DEFAULT 'store'
  CHECK (sales_channel IN ('store', 'ecommerce'));

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shift_id BIGINT REFERENCES cashier_shifts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS transaction_items (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0)
);

ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS product_category TEXT NOT NULL DEFAULT 'Uncategorized';
UPDATE transaction_items ti
SET product_category = p.category
FROM products p
WHERE ti.product_id = p.id AND ti.product_category = 'Uncategorized';

CREATE INDEX IF NOT EXISTS transactions_occurred_at_idx ON transactions (occurred_at DESC);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions (status);
CREATE INDEX IF NOT EXISTS transactions_processed_by_user_id_idx ON transactions (processed_by_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS transactions_customer_id_idx ON transactions (customer_id);
CREATE INDEX IF NOT EXISTS transactions_shift_id_idx ON transactions (shift_id);
CREATE INDEX IF NOT EXISTS transaction_items_transaction_id_idx ON transaction_items (transaction_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS integration_events (
  id BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  external_id TEXT,
  http_status SMALLINT,
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS integration_events_received_at_idx
  ON integration_events (received_at DESC);
