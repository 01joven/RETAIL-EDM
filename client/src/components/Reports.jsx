import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';
import { money } from '../api/money.js';

export default function Reports({ token }) {
  const [period, setPeriod] = useState('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const params = new URLSearchParams({ period });
    if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (to) {
      const endDate = new Date(`${to}T00:00:00`);
      endDate.setDate(endDate.getDate() + 1);
      params.set('to', endDate.toISOString());
    }
    api(`/reports/sales?${params}`, { token }).then((result) => { setReport(result); setError(''); }).catch((reason) => setError(reason.message));
  }, [period, token, from, to]);
  const chartData = (report?.buckets || []).map((bucket) => ({
    label: new Date(bucket.period_start).toLocaleDateString(undefined, period === 'monthly' ? { month: 'short', year: '2-digit' } : period === 'weekly' ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' }),
    sales: Number(bucket.sales),
    transactions: bucket.transactions
  }));
  const hourlyData = (report?.hourly || []).map((bucket) => ({
    label: `${bucket.hour}:00`,
    sales: Number(bucket.sales),
    transactions: bucket.transactions
  }));
  function exportReport() {
    if (!report) return;
    const rows = [
      ['Metric', 'Value'],
      ['Gross sales', report.grossSales],
      ['Net sales', report.netSales],
      ['Transactions', report.summary.transactions],
      ['Units sold', report.unitsSold],
      ['Average order', report.summary.average_order_value],
      [],
      ['Period', 'Transactions', 'Sales'],
      ...report.buckets.map((bucket) => [
        new Date(bucket.period_start).toLocaleString(),
        bucket.transactions,
        bucket.sales
      ]),
      [],
      ['Category', 'Units', 'Sales'],
      ...(report.categories || []).map((category) => [category.category, category.units, category.sales]),
      [],
      ['Channel', 'Transactions', 'Sales'],
      ...(report.channels || []).map((channel) => [channel.sales_channel, channel.transactions, channel.sales])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">BUSINESS PERFORMANCE</p><h1>Sales analytics</h1><p className="muted">Real-time POS sales across daily, weekly and monthly periods.</p></div><div className="report-actions"><label className="period-select">Report period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label className="period-select">From<input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label><label className="period-select">To<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label><button className="outline-button" type="button" onClick={exportReport} disabled={!report}>Export CSV <span>↓</span></button></div></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {!report && !error ? <div className="loading-panel">Loading sales report…</div> : report && <>
        <div className="stat-grid report-stats"><div className="report-stat"><span>Gross sales</span><strong>{money(report.grossSales)}</strong></div><div className="report-stat"><span>Net sales</span><strong>{money(report.netSales)}</strong></div><div className="report-stat"><span>Transactions</span><strong>{report.summary.transactions}</strong></div><div className="report-stat"><span>Units sold</span><strong>{report.unitsSold}</strong></div><div className="report-stat"><span>Average order value</span><strong>{money(report.summary.average_order_value)}</strong></div></div>
        <div className="analytics-mini-grid">
          <article className="panel analytics-card"><div className="panel-heading"><div><h2>Payment methods</h2><p>Completed sales by tender</p></div></div><div className="analytics-list">{(report.paymentMethods || []).map((method) => <div className="analytics-row" key={method.payment_method}><span>{method.payment_method === 'gcash' ? 'GCash' : 'Cash'}</span><strong>{money(method.sales)}</strong><small>{method.transactions} sales</small></div>)}</div></article>
          <article className="panel analytics-card"><div className="panel-heading"><div><h2>Exceptions</h2><p>Void and refund activity</p></div></div><div className="analytics-list"><div className="analytics-row"><span>Voided</span><strong>{report.exceptions?.voided || 0}</strong><small>{money(report.exceptions?.voided_sales)}</small></div><div className="analytics-row"><span>Refunded</span><strong>{report.exceptions?.refunded || 0}</strong><small>{money(report.exceptions?.refunded_sales)}</small></div></div></article>
          <article className="panel analytics-card"><div className="panel-heading"><div><h2>Sales channel</h2><p>Store vs. e-commerce orders</p></div></div><div className="analytics-list">{(report.channels || []).map((channel) => <div className="analytics-row" key={channel.sales_channel}><span>{channel.sales_channel === 'ecommerce' ? 'E-commerce' : 'Physical store'}</span><strong>{money(channel.sales)}</strong><small>{channel.transactions} transactions</small></div>)}{(!report.channels || report.channels.length === 0) && <div className="analytics-row"><span>No channel data yet</span></div>}</div></article>
          <article className="panel analytics-card"><div className="panel-heading"><div><h2>Sales by category</h2><p>Completed sales grouped by product category</p></div></div><div className="analytics-list">{(report.categories || []).slice(0, 6).map((category) => <div className="analytics-row" key={category.category}><span>{category.category}</span><strong>{money(category.sales)}</strong><small>{category.units} units sold</small></div>)}{(!report.categories || report.categories.length === 0) && <div className="analytics-row"><span>No category data yet</span></div>}</div></article>
        </div>
        <article className="panel report-panel"><div className="panel-heading"><div><h2>{period[0].toUpperCase() + period.slice(1)} sales</h2><p>Sales totals for completed POS transactions</p></div></div><div className="report-chart">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}><CartesianGrid stroke="#25364d" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `₱${value}`} /><Tooltip formatter={(value, name) => [name === 'sales' ? money(value) : value, name === 'sales' ? 'Sales' : 'Transactions']} /><Bar dataKey="sales" fill="#3b82f6" radius={[5, 5, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer> : <div className="empty-chart">No sales in this report period yet.</div>}</div></article>
        <article className="panel report-panel hourly-panel"><div className="panel-heading"><div><h2>Hourly sales</h2><p>Peak POS activity by hour</p></div></div><div className="report-chart">{hourlyData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={hourlyData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}><CartesianGrid stroke="#25364d" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `₱${value}`} /><Tooltip formatter={(value) => money(value)} /><Line type="monotone" dataKey="sales" stroke="#06b6d4" strokeWidth={3} dot={{ r: 3, fill: '#06b6d4' }} /></LineChart></ResponsiveContainer> : <div className="empty-chart">Hourly sales will appear after transactions arrive.</div>}</div></article>
        <article className="panel table-panel top-products-panel"><div className="table-toolbar"><div><h2>Top-selling products</h2><p>Ranked by completed sales revenue</p></div></div><div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>UNITS SOLD</th><th className="align-right">SALES</th></tr></thead><tbody>{(report.topProducts || []).map((product) => <tr key={product.name}><td><strong>{product.name}</strong></td><td>{product.units}</td><td className="align-right amount-cell">{money(product.sales)}</td></tr>)}{(!report.topProducts || report.topProducts.length === 0) && <tr><td colSpan="3" className="table-empty">No product sales available.</td></tr>}</tbody></table></div></article>
        <article className="panel table-panel report-table"><div className="table-toolbar"><div><h2>Period breakdown</h2><p>Sales and transaction counts</p></div></div><div className="table-scroll"><table><thead><tr><th>PERIOD START</th><th>TRANSACTIONS</th><th className="align-right">SALES</th></tr></thead><tbody>{report.buckets.map((bucket) => <tr key={bucket.period_start}><td>{new Date(bucket.period_start).toLocaleDateString()}</td><td>{bucket.transactions}</td><td className="align-right amount-cell">{money(bucket.sales)}</td></tr>)}{report.buckets.length === 0 && <tr><td colSpan="3" className="table-empty">No sales data available yet.</td></tr>}</tbody></table></div></article>
      </>}
    </section>
  );
}
