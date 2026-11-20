import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function IntegrationMonitor({ token }) {
  const [activity, setActivity] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const [activityResult, healthResult] = await Promise.all([
        api('/integration/activity', { token }),
        api('/health')
      ]);
      setActivity(activityResult);
      setHealth(healthResult);
      setError('');
    } catch (reason) {
      setError(reason.message);
    }
  }, [token]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const events = (activity?.events || []).filter((event) =>
    filter === 'all' || (filter === 'failed' ? !event.success : event.success)
  );
  const summary = activity?.summary;

  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">POS DATA PIPELINE</p><h1>API activity</h1><p className="muted">POS integration activity refreshes automatically every 15 seconds.</p></div><button className="outline-button" type="button" onClick={load}>Refresh now <span>↻</span></button></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="integration-health-row">
        <span className={`integration-health-dot ${health?.database === 'connected' ? 'healthy' : 'unhealthy'}`} />
        <strong>Database {health?.database || 'checking'}</strong>
        <span>API {health?.status || 'checking'}</span>
        <span>Last POS request: {summary?.last_received_at ? new Date(summary.last_received_at).toLocaleString() : 'No requests yet'}</span>
      </div>
      <div className="integration-stat-grid">
        <article className="report-stat"><span>Requests · 24 hours</span><strong>{summary?.requests_24h ?? '—'}</strong></article>
        <article className="report-stat"><span>Successful · 24 hours</span><strong>{summary?.successful_24h ?? '—'}</strong></article>
        <article className="report-stat"><span>Failed · 24 hours</span><strong>{summary?.failed_24h ?? '—'}</strong></article>
        <article className="report-stat"><span>Average response time</span><strong>{summary ? `${summary.avg_duration_ms} ms` : '—'}</strong></article>
      </div>
      <article className="panel table-panel">
        <div className="table-toolbar"><div><h2>Recent POS API requests</h2><p>Request metadata only; payment-card data is not stored here.</p></div><select className="event-filter" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All requests</option><option value="success">Successful</option><option value="failed">Failed</option></select></div>
        <div className="table-scroll"><table><thead><tr><th>RECEIVED</th><th>SOURCE</th><th>EVENT</th><th>REFERENCE</th><th>STATUS</th><th>LATENCY</th><th>DETAIL</th></tr></thead><tbody>
          {events.map((event) => <tr key={event.id}><td>{new Date(event.received_at).toLocaleString()}</td><td>{event.source}</td><td>{event.event_type}</td><td>{event.external_id || '—'}</td><td><span className={`status-pill ${event.success ? 'completed' : 'voided'}`}>{event.http_status} · {event.success ? 'Success' : 'Failed'}</span></td><td>{event.duration_ms} ms</td><td>{event.error_message || '—'}</td></tr>)}
          {events.length === 0 && <tr><td colSpan="7" className="table-empty">No API activity for this filter.</td></tr>}
        </tbody></table></div>
      </article>
    </section>
  );
}
