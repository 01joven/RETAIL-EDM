# RetailFlow POS Data Integration

RetailFlow is a React dashboard and Express REST API for importing POS sales into PostgreSQL and reviewing sales reports. It does not accept or store payment-card numbers, CVV values, or other cardholder data.

## Architecture

- **React/Vite frontend** (`client/src`) calls the versioned API and keeps its access token in memory only.
- **Express API** (`server/src`) validates input, authenticates dashboard users with an eight-hour JWT, applies role checks, and executes parameterized PostgreSQL queries.
- **POS integration** sends sales to `POST /api/v1/transactions/ingest` with the `x-pos-api-key` header. The API derives prices from the product catalog, persists each transaction and its items in one database transaction, and treats `externalId` as an idempotency key.
- **PostgreSQL** stores users, products, transactions, and transaction items. Roles are exactly `admin` and `cashier`; transaction item rows snapshot the product name, SKU, and unit price at sale time.
- **Reports** group completed transactions by day, week, or month. The date-range end is exclusive.

## Folder structure

```text
client/
  src/api/                 API client
  src/components/          Login, role dashboards, catalog, users, transactions, reports, settings
  src/App.jsx              Application state and page routing
  src/styles.css           Responsive dashboard styles
server/
  sql/schema.sql           PostgreSQL schema and indexes
  src/config/              Environment and database pool
  src/middleware/          Authentication, authorization, error responses
  src/routes/              Auth, products, transactions, reports
  src/services/            Transaction persistence
  src/scripts/              Schema migration and admin bootstrap
  test/                    Node test-runner tests
```

## Setup (Windows PowerShell)

Requirements: Node.js 20+ and PostgreSQL 16+ (local or managed, such as Neon).

1. Install the three package sets:

   ```powershell
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

2. Set `DATABASE_URL` in `server\.env` to the PostgreSQL connection string from your provider (for Neon, use the pooled connection string and keep its password private). The API reads it directly from the environment.

3. Configure the API. Copy the example and replace the placeholders:

   ```powershell
   Copy-Item server\.env.example server\.env
   notepad server\.env
   ```

   Create separate random secrets, for example:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Set the output as `JWT_SECRET`, run the command again for `POS_API_KEY`, and set a unique `ADMIN_PASSWORD` with at least 12 characters. Keep `.env` private; never commit production secrets. Do not share the database connection string.

4. Configure Resend for password recovery. Create an API key in the Resend dashboard and set `RESEND_API_KEY` in `server\.env`. Verify a sending domain with Resend, then set `RESEND_FROM_EMAIL` to a sender address on that domain (for example `RetailFlow <no-reply@your-domain.com>`). Keep the API key private. Resend's test sender is limited to verified recipients and is not suitable for sending to arbitrary Gmail accounts.

   Password recovery sends a six-digit code to the account's registered email. The code expires after 10 minutes, can be attempted at most five times, and a new code is rate-limited. Update the account email to the user's real Gmail address in **Users → Change email** before expecting recovery mail there.

5. Configure the browser API URL (the default uses Vite's local API proxy):

   ```powershell
   Copy-Item client\.env.example client\.env
   ```

6. Apply the schema and create the initial admin:

   ```powershell
   npm run db:migrate --prefix server
   npm run db:seed-admin --prefix server
   ```

   The migration adds cashier ownership and inventory stock, and enforces the two-role constraint while retaining existing transaction and product rows. The seed command reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `server\.env`; it never installs a default password.

7. Start the frontend and API:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:3000`. Sign in with the configured admin email and password.

## Render deployment

Use a Render **Web Service** with the repository root as its root directory:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Add `DATABASE_URL`, `JWT_SECRET`, and `POS_API_KEY` as Render environment variables. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to enable password reset email. Set `CLIENT_ORIGIN` to the deployed service URL.
- Set a Render pre-deploy command to `npm run db:migrate --prefix server` so schema updates are applied before new code starts.
- Run `npm run db:seed-admin --prefix server` once from the Render shell with `ADMIN_EMAIL` and `ADMIN_PASSWORD` set, if the production database has no admin account.

The root build script installs the client and server packages, builds the Vite frontend, and the Express server serves that build alongside the API.

## API overview

All endpoints are under `/api/v1`. Dashboard endpoints use `Authorization: Bearer <accessToken>`.

| Method and path | Access | Purpose |
|---|---|---|
| `GET /health` | Public | API health check |
| `POST /auth/login` | Public, rate-limited | Issue JWT |
| `POST /auth/forgot-password` | Public, rate-limited | Request a one-time email verification code |
| `POST /auth/reset-password` | Public, rate-limited | Reset password with a valid code |
| `GET /auth/me` | Authenticated | Current user |
| `GET /products` | Admin or cashier | List products and stock; cashiers see active products only |
| `POST /products` | Admin | Create a product with initial stock |
| `PATCH /products/:id` | Admin | Update product details, active status, or stock |
| `DELETE /products/:id` | Admin | Deactivate product without removing historical references |
| `GET /users` | Admin | List accounts |
| `POST /users` | Admin | Create a cashier account (public registration is disabled) |
| `PATCH /users/:id` | Admin | Change email, password, or demote another admin to cashier |
| `DELETE /users/:id` | Admin | Delete another account; cannot delete the final admin |
| `GET /settings` | Admin | View non-secret system settings |
| `GET /transactions` | Admin or cashier | Search/date filter; admins see all, cashiers only their sales; max 100 |
| `GET /transactions/:id` | Admin or owning cashier | View sale details and receipt |
| `POST /transactions` | Admin or cashier | Create sale; authenticated user is recorded as processor |
| `POST /transactions/ingest` | POS API key | Import a POS transaction |
| `GET /reports/sales?period=daily\|weekly\|monthly` | Admin | Sales totals, transaction counts, average order, and period buckets |

Role authorization is enforced by Express and the current database role is reloaded on each authenticated request, so role changes and deleted accounts invalidate existing access immediately. Cashiers cannot manage products/users/settings or access administrative sales reports.

POS ingestion body:

```json
{
  "externalId": "STORE-01-000123",
  "occurredAt": "2026-11-17T09:30:00Z",
  "items": [
    { "productId": 1, "quantity": 2 }
  ]
}
```

Required header: `x-pos-api-key: <POS_API_KEY>`. Do not include payment-card fields. Repeated `externalId` values return the previously saved transaction rather than inserting a duplicate.

## Verification

```powershell
npm test --prefix server
npm run build --prefix client
```

To check API readiness, run the API and request `http://localhost:4000/api/v1/health`. Database-backed routes require PostgreSQL to be running, the schema migration to have completed, and an admin user to have been seeded.

## Security boundary

This application intentionally excludes card data and applies bcrypt password hashing, JWT authentication, role checks, login rate limiting, Helmet headers, CORS origin configuration, bounded JSON requests, input validation, and parameterized SQL. It is not by itself a PCI DSS certification: deploy behind HTTPS, protect and rotate secrets, restrict network/database access, maintain audit/logging and incident procedures, and validate the full environment against your organization's PCI DSS obligations.
