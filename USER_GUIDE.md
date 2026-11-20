# RetailFlow POS User Guide

This guide covers the RetailFlow POS system in this workspace. It describes only the functions currently available in the system.

## 1. System overview

RetailFlow is for retail and e-commerce operations. Its selected system scope is:

- **Data source:** POS
- **Integration method:** Real-Time APIs
- **Governance need:** PCI DSS
- **Output:** Sales Analytics

POS transactions are received through the API and used for sales reporting. The application does not store cardholder data and is not a
PCI DSS certification.

The system includes:

- Admin and cashier accounts
- A cashier point-of-sale screen with product search, cart, checkout, and printable receipts
- Basic customer records with optional email and phone, selectable during checkout
- Product prices and stock quantities
- Transaction history, receipts, and CSV export
- Admin sales analytics, audit events, and POS API activity

## 2. Roles and access

| Role | Access |
|---|---|
| Admin | Admin menu: overview, transactions, products and inventory, customers, sales analytics, users, audit log, API activity, and settings |
| Cashier | Cashier menu: point of sale, transaction history, active products, and customer information |

Both roles use the same sign-in form. The account role controls the dashboard and menu: admins see only the admin menu, while cashiers
see only the cashier menu. Cashier accounts are created by an administrator. Each staff member should use their own account.

## 3. Sign in and password recovery

1. Open the RetailFlow application URL provided by your administrator.
2. Enter your registered email address and password in the single sign-in form.
3. Select **Sign in**.
4. Select **Sign out** from the user panel when finished. This ends the local session and invalidates active access tokens for the account.

RetailFlow uses the account's assigned role to open the correct workspace: admins land on **Overview**, while cashiers land on
**Point of sale**. The login form detects the role from the authenticated account; there is no separate login page or role selector.

To reset a forgotten password:

1. Select **Forgot password?** on the sign-in screen.
2. Enter the email address registered to your account and request a verification code.
3. Enter the six-digit code from your email and a new password of at least 12 characters.
4. Confirm the new password and select **Reset password**.

The code expires after 10 minutes and can be tried up to five times. If recovery is unavailable, contact an administrator.

## 4. Point of sale

The **Point of sale** page is available to cashiers.

1. Search for a product by name or SKU, or filter by category.
2. Select **Add** for each product. Use the quantity field in the cart to change the quantity, or **×** to remove an item.
3. Check the cart items and total.
4. Optionally select an existing customer, or leave **Walk-in customer** selected.
5. Select the sales channel: **Physical store** or **E-commerce**.
6. Select the payment method: **Cash** or **GCash**.
7. For cash, enter the amount received. The screen shows the change due; cash checkout is disabled if the tender is less than the total.
8. Select **Complete sale**.
9. Review the receipt. Select **Print receipt** to print it, or **Done** to close it.

The price is taken from the product catalog. Completing a sale reduces the stock quantity for each item. The cashier screen also shows
the signed-in cashier's recent sales.

## 5. Customer information

The **Customer information** page is available to admins and cashiers. Add a customer's name and, optionally, email and phone number.
Customer records can be searched by name or contact detail. Select an existing customer from the POS checkout list to associate that
customer with a sale; otherwise, the sale is recorded as a walk-in. The customer link appears in transaction history and on the receipt.
Deleting a customer record is not available in the current interface.

## 6. Products and stock

The **Products** page shows product name, category, SKU, price, stock quantity, and active status.

- Cashiers can search and view active products.
- Admins can add products and edit SKU, name, category, price, stock quantity, or active status.
- Admins can deactivate a product and activate it again later. Deactivated products remain in historical sales.
- Products with no stock cannot be added to a cashier's sale.
- Completing a sale reduces stock. Voiding a completed transaction restores the sold quantity.

Use the product edit form to correct a stock quantity. Check the product and quantity carefully before saving.

## 7. Transactions

Open **Transactions** or **Transaction history** to search and review sales.

- Search by POS reference and filter by date.
- Select **Receipt** to review or print the transaction receipt.
- Select **Export CSV** to download the records currently shown by the selected search and date filters.
- The list displays up to the 100 most recent matching transactions.
- Admins can view all transactions. Cashiers can view only transactions processed by their own account.
- Admins can void or refund a completed transaction. Enter a reason when prompted. A transaction that is already voided or refunded cannot
  be changed again through these actions.

Voiding a sale restores its sold quantities to product stock. Refunding changes the transaction status; it does not restore stock
automatically. Review the transaction carefully before choosing an action.

## 8. Overview and sales reports

The admin **Overview** page summarizes the last seven days, including gross sales, net sales, completed transaction count, average order
value, active product count, sales trend, recent transactions, top products, payment methods, sales channels, and active products that are
out of stock. Inventory alerts report products with zero stock; no low-stock threshold is configured.

The **Sales analytics** page supports daily, weekly, or monthly periods and date filters. It displays:

- Gross and net sales
- Completed transaction count, units sold, and average order value
- Sales by period and hour
- Top-selling products
- Sales by payment method, channel, and product category
- Void and refund counts and amounts

Select **Export CSV** to download the report. Reports use the transactions recorded in RetailFlow; check transaction history if a sale is
missing or has an unexpected status.

## 9. User management

Only admins can open **Users**.

- **Create cashier account** creates a cashier account with an email and temporary password.
- **Change email** updates the account email address. Use an address the account holder can access, especially for password recovery.
- **Reset password** lets an admin set a new password of at least 12 characters.
- **Make cashier** changes another admin account to the cashier role.
- **Delete** removes another account. Existing sales are retained.

The current screen does not provide an action for promoting a cashier to admin. Do not share administrator credentials.

## 10. Audit log, API activity, and settings

- **Audit log** lets admins review recent administrative and transaction events.
- **API activity** shows the API/database health, recent POS requests, success and failure counts, and response times. It refreshes every 15
  seconds; select **Refresh now** to update immediately. The page records request metadata, not request bodies.
- **System settings** is a read-only view of operational information, such as API version, POS integration, supported roles, and whether
  cardholder data is stored. Secret values and connection strings are not shown.

## 11. POS API integration

External POS systems can send transactions to:

```text
POST /api/v1/transactions/ingest
```

Include the configured POS API key in this header:

```text
x-pos-api-key: <POS_API_KEY>
```

Example request body:

```json
{
  "externalId": "STORE-01-000123",
  "occurredAt": "2026-11-17T09:30:00Z",
  "salesChannel": "store",
  "paymentMethod": "cash",
  "items": [
    { "productId": 1, "quantity": 2 }
  ]
}
```

Integration requirements:

- Provide a unique, stable `externalId` for each sale. Reusing an ID returns the existing transaction instead of creating another.
- `occurredAt` must be a valid timestamp. UTC timestamps are recommended.
- Send one or more active product IDs and positive integer quantities. The API looks up prices from the RetailFlow product catalog and checks
  available stock.
- `salesChannel` may be `store` or `ecommerce`; it defaults to `store`.
- `paymentMethod` may be `cash` or `gcash`; it defaults to `cash`.
- Do not send card numbers, CVV/CVC, PINs, magnetic-stripe data, or other payment-card data.
- Keep the POS API key private. If it is exposed, notify the administrator so it can be rotated.

| Response | Meaning |
|---|---|
| 201 | A new transaction was created |
| 200 | The `externalId` already exists; the existing transaction was returned |
| 400 | The request is invalid, a product is inactive, or the sale cannot be processed |
| 401 | POS API key is missing or invalid |
| 409 | The reference conflicts with another transaction or stock is insufficient |

If a request times out, check **API activity** and transaction history before retrying. Reuse the same `externalId` when retrying the same
sale.

## 12. Data handling and operational notes

RetailFlow must not receive or store cardholder data. Only send the sale information required to identify products, quantities, payment
method, sales channel, and transaction total.

Protect staff passwords and the POS API key. Production deployments should use HTTPS and secure server-side secret configuration. The
application is not, by itself, a PCI DSS certification; the organization remains responsible for validating its complete payment and
hosting environment.

For administrator installation and deployment steps, see [README.md](./README.md).
