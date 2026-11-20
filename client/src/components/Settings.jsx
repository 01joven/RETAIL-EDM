import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Settings({ token }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/settings', { token }).then(setSettings).catch((reason) => setError(reason.message));
  }, [token]);
  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">SYSTEM ADMINISTRATION</p><h1>System settings</h1><p className="muted">View safe operational settings for this deployment.</p></div></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {settings && <article className="panel settings-panel">
        <h2 className="scope-heading">Retail &amp; e-commerce system scope</h2>
        <div className="scope-grid" aria-label="Selected system scope">
          <div className="scope-card"><span>Data source</span><strong>POS</strong></div>
          <div className="scope-card"><span>Integration method</span><strong>Real-Time APIs</strong></div>
          <div className="scope-card"><span>Governance need</span><strong>PCI DSS</strong></div>
          <div className="scope-card"><span>System output</span><strong>Sales Analytics</strong></div>
        </div>
        <div className="settings-row"><span>API version</span><strong>{settings.apiVersion}</strong></div><div className="settings-row"><span>POS integration</span><strong>{settings.posIntegration}</strong></div><div className="settings-row"><span>Real-time ingestion</span><strong>{settings.realtimeIngestion}</strong></div><div className="settings-row"><span>Cardholder data stored</span><strong>{settings.cardholderDataStorage ? 'Yes' : 'No'}</strong></div><div className="settings-row"><span>Void and refund</span><strong>{settings.voidAndRefundEnabled ? 'Enabled' : 'Disabled'}</strong></div><div className="settings-row"><span>Audit retention</span><strong>{settings.auditRetention}</strong></div><div className="settings-row"><span>Permitted roles</span><strong>{settings.roles.join(', ')}</strong></div><p className="muted settings-note">PCI DSS is the selected governance requirement; this application does not claim certification. Secret values and connection strings are never exposed in this screen.</p>
      </article>}
      {!settings && !error && <div className="loading-panel">Loading system settings…</div>}
    </section>
  );
}
