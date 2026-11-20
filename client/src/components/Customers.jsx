import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const emptyForm = { name: '', email: '', phone: '' };

export default function Customers({ token, user }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCustomers = useCallback(async (query = search) => {
    const result = await api(`/customers?limit=100&search=${encodeURIComponent(query)}`, { token });
    setCustomers(result.customers);
    setError('');
  }, [search, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      loadCustomers().catch((reason) => setError(reason.message)).finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  async function createCustomer(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api('/customers', {
        token,
        method: 'POST',
        body: JSON.stringify(form)
      });
      setForm(emptyForm);
      setNotice('Customer record added.');
      await loadCustomers('');
      setSearch('');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-content">
      <div className="page-heading">
        <div><p className="eyebrow">{user.role === 'admin' ? 'CUSTOMER DIRECTORY' : 'CUSTOMER INFORMATION'}</p><h1>Customers</h1><p className="muted">Keep basic customer contact details available for checkout.</p></div>
      </div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {notice && <div className="success-banner" role="status">{notice}</div>}
      <article className="panel product-form customer-form-panel">
        <div><h2>Add customer</h2><p>Name is required. Email and phone are optional.</p></div>
        <form className="customer-form" onSubmit={createCustomer}>
          <label>Name<input required maxLength="120" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoComplete="name" /></label>
          <label>Email<input type="email" maxLength="254" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" /></label>
          <label>Phone<input type="tel" maxLength="32" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} autoComplete="tel" /></label>
          <button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Add customer'} <span>+</span></button>
        </form>
      </article>
      <article className="panel table-panel">
        <div className="table-toolbar">
          <div><h2>Customer records</h2><p>{customers.length} records shown, up to 100</p></div>
          <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or contact…" /></label>
        </div>
        <div className="table-scroll"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>PHONE</th><th>ADDED</th></tr></thead><tbody>
          {customers.map((customer) => <tr key={customer.id}><td><strong>{customer.name}</strong></td><td>{customer.email || '—'}</td><td>{customer.phone || '—'}</td><td>{new Date(customer.created_at).toLocaleDateString()}</td></tr>)}
          {!loading && customers.length === 0 && <tr><td colSpan="4" className="table-empty">No customer records found.</td></tr>}
          {loading && <tr><td colSpan="4" className="table-empty">Loading customer records…</td></tr>}
        </tbody></table></div>
      </article>
    </section>
  );
}
