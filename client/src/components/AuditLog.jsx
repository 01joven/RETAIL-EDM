import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AuditLog({ token }) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/audit', { token }).then((result) => setEvents(result.events)).catch((reason) => setError(reason.message));
  }, [token]);

  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">SECURITY & GOVERNANCE</p><h1>Audit log</h1><p className="muted">Review administrative and transaction security events.</p></div></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <article className="panel table-panel">
        <div className="table-toolbar"><div><h2>Recent events</h2><p>{events.length} records retained</p></div></div>
        <div className="table-scroll"><table><thead><tr><th>DATE & TIME</th><th>ACTOR</th><th>ACTION</th><th>ENTITY</th><th>DETAILS</th></tr></thead><tbody>
          {events.map((event) => <tr key={event.id}><td>{new Date(event.occurred_at).toLocaleString()}</td><td>{event.actor_email || 'POS API'}</td><td><strong>{event.action}</strong></td><td>{event.entity_type} #{event.entity_id}</td><td>{JSON.stringify(event.details)}</td></tr>)}
          {events.length === 0 && <tr><td colSpan="5" className="table-empty">No audit events recorded.</td></tr>}
        </tbody></table></div>
      </article>
    </section>
  );
}
