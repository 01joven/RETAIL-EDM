import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';

const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0));

export default function Reports({ token }) {
  const [period, setPeriod] = useState('daily');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api(`/reports/sales?period=${period}`, { token }).then(setReport).catch((reason) => setError(reason.message));
  }, [period, token]);
  const chartData = (report?.buckets || []).map((bucket) => ({
    label: new Date(bucket.period_start).toLocaleDateString(undefined, period === 'monthly' ? { month: 'short', year: '2-digit' } : period === 'weekly' ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' }),
    sales: Number(bucket.sales),
    transactions: bucket.transactions
  }));
  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">BUSINESS PERFORMANCE</p><h1>Sales reports</h1><p className="muted">Track completed sales over daily, weekly and monthly periods.</p></div><label className="period-select">Report period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {!report && !error ? <div className="loading-panel">Loading sales report…</div> : report && <>
        <div className="stat-grid report-stats"><div className="report-stat"><span>Total sales</span><strong>{money(report.summary.sales)}</strong></div><div className="report-stat"><span>Transactions</span><strong>{report.summary.transactions}</strong></div><div className="report-stat"><span>Average order value</span><strong>{money(report.summary.average_order_value)}</strong></div></div>
        <article className="panel report-panel"><div className="panel-heading"><div><h2>{period[0].toUpperCase() + period.slice(1)} sales</h2><p>Sales totals for completed POS transactions</p></div></div><div className="report-chart">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}><CartesianGrid stroke="#edf0f5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8b94a7', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b94a7', fontSize: 12 }} tickFormatter={(value) => `$${value}`} /><Tooltip formatter={(value, name) => [name === 'sales' ? money(value) : value, name === 'sales' ? 'Sales' : 'Transactions']} /><Bar dataKey="sales" fill="#7059e8" radius={[5, 5, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer> : <div className="empty-chart">No sales in this report period yet.</div>}</div></article>
        <article className="panel table-panel report-table"><div className="table-toolbar"><div><h2>Period breakdown</h2><p>Sales and transaction counts</p></div></div><div className="table-scroll"><table><thead><tr><th>PERIOD START</th><th>TRANSACTIONS</th><th className="align-right">SALES</th></tr></thead><tbody>{report.buckets.map((bucket) => <tr key={bucket.period_start}><td>{new Date(bucket.period_start).toLocaleDateString()}</td><td>{bucket.transactions}</td><td className="align-right amount-cell">{money(bucket.sales)}</td></tr>)}{report.buckets.length === 0 && <tr><td colSpan="3" className="table-empty">No sales data available yet.</td></tr>}</tbody></table></div></article>
      </>}
    </section>
  );
}
