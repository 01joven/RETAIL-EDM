import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StatCard from './StatCard.jsx';

const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0));

export default function CashierDashboard({ token }) {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    const [productResult, transactionResult] = await Promise.all([
      api('/products', { token }),
      api('/transactions?limit=5', { token })
    ]);
    setProducts(productResult.products);
    setTransactions(transactionResult.transactions);
  }, [token]);
  useEffect(() => {
    load().catch((reason) => setError(reason.message));
  }, [load]);

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.sku}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const total = cart.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + (product ? Number(product.unit_price) * item.quantity : 0);
  }, 0);

  function addToCart(product) {
    const existing = cart.find((item) => item.productId === product.id);
    if (product.stock_quantity < 1 || (existing && existing.quantity >= product.stock_quantity)) {
      setError('Requested quantity exceeds available stock');
      return;
    }
    if (existing) setCart((current) => current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    else setCart((current) => [...current, { productId: product.id, quantity: 1 }]);
    setError('');
  }

  function changeQuantity(productId, quantity) {
    const product = products.find((candidate) => candidate.id === productId);
    const nextQuantity = Math.min(product?.stock_quantity ?? 1, Math.max(1, Number(quantity) || 1));
    setCart((current) => current.map((item) => item.productId === productId ? { ...item, quantity: nextQuantity } : item));
  }

  async function checkout() {
    if (!cart.length) return;
    setBusy(true);
    setError('');
    try {
      const result = await api('/transactions', {
        token,
        method: 'POST',
        body: JSON.stringify({
          externalId: `POS-${crypto.randomUUID()}`,
          occurredAt: new Date().toISOString(),
          items: cart
        })
      });
      const detail = await api(`/transactions/${result.transaction.id}`, { token });
      setReceipt(detail);
      setCart([]);
      await load();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">CASHIER WORKSPACE</p><h1>Point of sale</h1><p className="muted">Search products, build a sale, and print customer receipts.</p></div></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="stat-grid cashier-stats"><StatCard label="Your recent transactions" value={transactions.length} detail="Most recent sales" icon="↗" tone="blue" /><StatCard label="Available products" value={products.filter((product) => product.stock_quantity > 0).length} detail="In-stock products" icon="▤" tone="orange" /><StatCard label="Current sale" value={money(total)} detail={`${cart.reduce((sum, item) => sum + item.quantity, 0)} items in cart`} icon="$" /></div>
      <div className="content-grid pos-grid">
        <article className="panel pos-products"><div className="panel-heading"><div><h2>Available products</h2><p>Search by product name or SKU</p></div></div><label className="search-box pos-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products…" /></label><div className="pos-product-list">
          {filteredProducts.map((product) => <div className="pos-product-row" key={product.id}><div><strong>{product.name}</strong><small>{product.sku} · {product.stock_quantity} in stock</small></div><strong>{money(product.unit_price)}</strong><button className="outline-button" disabled={product.stock_quantity < 1} onClick={() => addToCart(product)}>Add</button></div>)}
          {filteredProducts.length === 0 && <div className="empty-chart">No available products match your search.</div>}
        </div></article>
        <article className="panel cart-panel"><div className="panel-heading"><div><h2>Current sale</h2><p>Review items before checkout</p></div></div><div className="cart-items">
          {cart.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            if (!product) return null;
            return <div className="cart-row" key={item.productId}><div className="cart-product"><strong>{product.name}</strong><small>{money(product.unit_price)} each</small></div><input aria-label={`Quantity for ${product.name}`} type="number" min="1" max={product.stock_quantity} value={item.quantity} onChange={(event) => changeQuantity(item.productId, event.target.value)} /><strong>{money(Number(product.unit_price) * item.quantity)}</strong><button className="remove-item" aria-label={`Remove ${product.name}`} onClick={() => setCart((current) => current.filter((entry) => entry.productId !== item.productId))}>×</button></div>;
          })}
          {cart.length === 0 && <div className="empty-chart">Add products to start a sale.</div>}
        </div><div className="cart-total"><span>Total</span><strong>{money(total)}</strong></div><button className="primary-button checkout-button" disabled={busy || !cart.length} onClick={checkout}>{busy ? 'Processing…' : 'Complete sale'} <span>→</span></button></article>
      </div>
      <article className="panel table-panel cashier-history"><div className="table-toolbar"><div><h2>Your recent sales</h2><p>Only transactions processed by your account</p></div></div><div className="table-scroll"><table><thead><tr><th>POS REFERENCE</th><th>DATE &amp; TIME</th><th>STATUS</th><th className="align-right">TOTAL</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td><strong>{transaction.external_id}</strong></td><td>{new Date(transaction.occurred_at).toLocaleString()}</td><td><span className={`status-pill ${transaction.status}`}>{transaction.status}</span></td><td className="align-right amount-cell">{money(transaction.total)}</td></tr>)}{transactions.length === 0 && <tr><td colSpan="4" className="table-empty">Your sales will appear here after checkout.</td></tr>}</tbody></table></div></article>
      {receipt && <div className="receipt-overlay" role="dialog" aria-modal="true" aria-label="Sales receipt"><article className="receipt-card"><button className="receipt-close no-print" onClick={() => setReceipt(null)} aria-label="Close receipt">×</button><div className="receipt-brand">RetailFlow</div><p className="receipt-heading">SALES RECEIPT</p><p className="receipt-reference">{receipt.transaction.external_id}</p><p className="receipt-date">{new Date(receipt.transaction.occurred_at).toLocaleString()}</p><div className="receipt-lines">{receipt.items.map((item) => <div className="receipt-line" key={item.product_id}><span>{item.product_name} × {item.quantity}</span><strong>{money(item.line_total)}</strong></div>)}</div><div className="receipt-total"><span>Total</span><strong>{money(receipt.transaction.total)}</strong></div><p className="receipt-thanks">Thank you for your purchase</p><div className="receipt-actions no-print"><button className="outline-button" onClick={() => window.print()}>Print receipt</button><button className="primary-button" onClick={() => setReceipt(null)}>Done</button></div></article></div>}
    </section>
  );
}
