import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';
import StatCard from './StatCard.jsx';
import { money } from '../api/money.js';

export default function Overview({ token, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    Promise.all([
      api(`/reports/sales?period=daily&from=${encodeURIComponent(from.toISOString())}`, { token }),
      api('/transactions?limit=6', { token }),
      api('/products', { token })
    ]).then(([report, recent, productResult]) => setData({
      report,
      recent: recent.transactions,
      products: productResult.products
    }))
      .catch((reason) => setError(reason.message));
  }, [token]);
  const summary = data?.report.summary;
  const activeProducts = (data?.products || []).filter((product) => product.active);
  const outOfStock = activeProducts.filter((product) => Number(product.stock_quantity) === 0);
  const chartData = (data?.report.buckets || []).map((bucket) => ({
    day: new Date(bucket.period_start).toLocaleDateString(undefined, { weekday: 'short' }),
    sales: Number(bucket.sales)
  }));
  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">REAL-TIME SALES ANALYTICS</p><h1>Overview</h1><p className="muted">Your retail and e-commerce performance at a glance.</p></div><button className="outline-button" onClick={() => onNavigate('reports')}>View reports <span>→</span></button></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {!data && !error ? <div className="loading-panel">Loading your sales overview…</div> : null}
      {data && <>
        <div className="stat-grid overview-stats">
          <StatCard label="Gross sales" value={money(data.report.grossSales)} detail="Before refunds, excluding voids" icon="$" />
          <StatCard label="Transactions" value={summary.transactions} detail="Completed orders" icon="↗" tone="blue" />
          <StatCard label="Average order" value={money(summary.average_order_value)} detail="Per completed transaction" icon="◉" tone="orange" />
          <StatCard label="Net sales" value={money(data.report.netSales)} detail="After voids and refunds" icon="N" tone="blue" />
          <StatCard label="Total products" value={activeProducts.length} detail="Active catalog products" icon="▤" tone="orange" />
        </div>
        <div className="content-grid">
          <article className="panel sales-panel"><div className="panel-heading"><div><h2>Sales trend</h2><p>Daily sales performance</p></div><span className="period-chip">Last 7 days</span></div>
            <div className="chart-wrap">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}><CartesianGrid stroke="#25364d" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `₱${value}`} /><Tooltip formatter={(value) => money(value)} /><Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#17263d' }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer> : <div className="empty-chart">Sales activity will appear here as transactions arrive.</div>}</div>
          </article>
          <article className="panel recent-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Latest POS activity</p></div><button className="text-button" onClick={() => onNavigate('transactions')}>See all →</button></div>
            {data.recent.length ? <div className="recent-list">{data.recent.slice(0, 5).map((transaction) => <div className="recent-row" key={transaction.id}><div className="transaction-symbol">↗</div><div className="recent-info"><strong>{transaction.external_id}</strong><small>{transaction.customer_name || 'Walk-in'} · {new Date(transaction.occurred_at).toLocaleString()}</small></div><strong className="recent-amount">{money(transaction.total)}</strong></div>)}</div> : <div className="empty-state">No transactions yet. Connect a POS source or create a transaction through the API.</div>}
          </article>
        </div>
        <div className="analytics-mini-grid overview-analytics">
          <article className="panel analytics-card"><div className="panel-heading"><div><h2>Top products</h2><p>Highest-selling completed items</p></div></div><div className="analytics-list">{(data.report.topProducts || []).slice(0, 5).map((product) => <div className="analytics-row" key={product.name}><span>{product.name}</span><strong>{money(product.sales)}</strong><small>{product.units} units sold</small></div>)}</div></article>
          <article className="panel analytics-card"><div className="panel-heading"><div><h2>Payment mix</h2><p>Sales by payment method</p></div></div><div className="analytics-list">{(data.report.paymentMethods || []).map((method) => <div className="analytics-row" key={method.payment_method}><span>{method.payment_method === 'gcash' ? 'GCash' : 'Cash'}</span><strong>{money(method.sales)}</strong><small>{method.transactions} completed sales</small></div>)}</div></article>
          <article className="panel analytics-card"><div className="panel-heading"><div><h2>Sales channels</h2><p>Store and e-commerce mix</p></div></div><div className="analytics-list">{(data.report.channels || []).map((channel) => <div className="analytics-row" key={channel.sales_channel}><span>{channel.sales_channel === 'ecommerce' ? 'E-commerce' : 'Physical store'}</span><strong>{money(channel.sales)}</strong><small>{channel.transactions} orders</small></div>)}</div></article>
          <article className="panel analytics-card inventory-alerts"><div className="panel-heading"><div><h2>Inventory alerts</h2><p>Active products with no stock</p></div><span className="alert-count">{outOfStock.length}</span></div><div className="analytics-list">{outOfStock.slice(0, 5).map((product) => <div className="analytics-row inventory-alert-row" key={product.id}><span>{product.name}</span><strong>{product.stock_quantity} in stock</strong><small>{product.sku}</small></div>)}{outOfStock.length === 0 && <div className="inventory-clear">No active products are out of stock.</div>}</div></article>
        </div>
      </>}
    </section>
  );
}
