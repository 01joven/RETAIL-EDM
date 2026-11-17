import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0));

export default function Transactions({ token }) {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100', search });
      if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
      if (to) {
        const endDate = new Date(`${to}T00:00:00`);
        endDate.setDate(endDate.getDate() + 1);
        params.set('to', endDate.toISOString());
      }
      api(`/transactions?${params}`, { token })
        .then((result) => { setTransactions(result.transactions); setError(''); })
        .catch((reason) => setError(reason.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [token, search, from, to]);

  async function viewReceipt(transactionId) {
    try {
      setReceipt(await api(`/transactions/${transactionId}`, { token }));
      setError('');
    } catch (reason) { setError(reason.message); }
  }

  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">POS ACTIVITY</p><h1>Transactions</h1><p className="muted">Search and review sales and print receipts.</p></div></div>
      <article className="panel table-panel">
        <div className="table-toolbar"><div><h2>Transaction history</h2><p>{transactions.length} records shown</p></div><div className="filter-controls"><label className="date-filter">From<input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label><label className="date-filter">To<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search POS reference…" /></label></div></div>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="table-scroll"><table><thead><tr><th>POS REFERENCE</th><th>DATE &amp; TIME</th><th>ITEMS</th><th>STATUS</th><th className="align-right">TOTAL</th><th></th></tr></thead><tbody>
          {transactions.map((transaction) => <tr key={transaction.id}><td><span className="ref-icon">↗</span><strong>{transaction.external_id}</strong></td><td>{new Date(transaction.occurred_at).toLocaleString()}</td><td>{transaction.item_count} items</td><td><span className={`status-pill ${transaction.status}`}>{transaction.status}</span></td><td className="align-right amount-cell">{money(transaction.total)}</td><td><button className="text-button" onClick={() => viewReceipt(transaction.id)}>Receipt</button></td></tr>)}
          {!loading && transactions.length === 0 && <tr><td colSpan="6" className="table-empty">No matching transactions found.</td></tr>}
          {loading && <tr><td colSpan="6" className="table-empty">Loading transactions…</td></tr>}
        </tbody></table></div>
        <div className="table-foot">Showing up to 100 most recent records</div>
      </article>
      {receipt && <div className="receipt-overlay" role="dialog" aria-modal="true" aria-label="Sales receipt"><article className="receipt-card"><button className="receipt-close no-print" onClick={() => setReceipt(null)} aria-label="Close receipt">×</button><div className="receipt-brand">RetailFlow</div><p className="receipt-heading">SALES RECEIPT</p><p className="receipt-reference">{receipt.transaction.external_id}</p><p className="receipt-date">{new Date(receipt.transaction.occurred_at).toLocaleString()}</p><div className="receipt-lines">{receipt.items.map((item) => <div className="receipt-line" key={item.product_id}><span>{item.product_name} × {item.quantity}</span><strong>{money(item.line_total)}</strong></div>)}</div><div className="receipt-total"><span>Total</span><strong>{money(receipt.transaction.total)}</strong></div><p className="receipt-thanks">Thank you for your purchase</p><div className="receipt-actions no-print"><button className="outline-button" onClick={() => window.print()}>Print receipt</button><button className="primary-button" onClick={() => setReceipt(null)}>Done</button></div></article></div>}
    </section>
  );
}
