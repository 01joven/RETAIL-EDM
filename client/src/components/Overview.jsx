import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';
import StatCard from './StatCard.jsx';

const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0));

export default function Overview({ token, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    Promise.all([
      api(`/reports/sales?period=daily&from=${encodeURIComponent(from.toISOString())}`, { token }),
      api('/transactions?limit=6', { token })
    ]).then(([report, recent]) => setData({ report, recent: recent.transactions }))
      .catch((reason) => setError(reason.message));
  }, [token]);
  const summary = data?.report.summary;
  const chartData = (data?.report.buckets || []).map((bucket) => ({
    day: new Date(bucket.period_start).toLocaleDateString(undefined, { weekday: 'short' }),
    sales: Number(bucket.sales)
  }));
  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">YOUR STORE AT A GLANCE</p><h1>Overview</h1><p className="muted">Here’s how your business is performing.</p></div><button className="outline-button" onClick={() => onNavigate('reports')}>View reports <span>→</span></button></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {!data && !error ? <div className="loading-panel">Loading your sales overview…</div> : null}
      {data && <>
        <div className="stat-grid">
          <StatCard label="Total sales" value={money(summary.sales)} detail="Completed transactions" icon="$" />
          <StatCard label="Transactions" value={summary.transactions} detail="Completed orders" icon="↗" tone="blue" />
          <StatCard label="Average order" value={money(summary.average_order_value)} detail="Per completed transaction" icon="◉" tone="orange" />
        </div>
        <div className="content-grid">
          <article className="panel sales-panel"><div className="panel-heading"><div><h2>Sales trend</h2><p>Daily sales performance</p></div><span className="period-chip">Last 7 days</span></div>
            <div className="chart-wrap">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}><CartesianGrid stroke="#edf0f5" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8b94a7', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b94a7', fontSize: 12 }} tickFormatter={(value) => `$${value}`} /><Tooltip formatter={(value) => money(value)} /><Line type="monotone" dataKey="sales" stroke="#7059e8" strokeWidth={3} dot={{ r: 4, fill: '#7059e8', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer> : <div className="empty-chart">Sales activity will appear here as transactions arrive.</div>}</div>
          </article>
          <article className="panel recent-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Latest POS activity</p></div><button className="text-button" onClick={() => onNavigate('transactions')}>See all →</button></div>
            {data.recent.length ? <div className="recent-list">{data.recent.slice(0, 5).map((transaction) => <div className="recent-row" key={transaction.id}><div className="transaction-symbol">↗</div><div className="recent-info"><strong>{transaction.external_id}</strong><small>{new Date(transaction.occurred_at).toLocaleString()}</small></div><strong className="recent-amount">{money(transaction.total)}</strong></div>)}</div> : <div className="empty-state">No transactions yet. Connect a POS source or create a transaction through the API.</div>}
          </article>
        </div>
      </>}
    </section>
  );
}
