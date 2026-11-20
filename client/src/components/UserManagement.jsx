import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const initialForm = { email: '', password: '' };

export default function UserManagement({ token, currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const load = useCallback(() => api('/users', { token }).then((result) => setUsers(result.users)).catch((reason) => setError(reason.message)), [token]);
  useEffect(() => { load(); }, [load]);

  async function createUser(event) {
    event.preventDefault();
    try {
      await api('/users', { token, method: 'POST', body: JSON.stringify(form) });
      setForm(initialForm);
      setError('');
      await load();
    } catch (reason) { setError(reason.message); }
  }

  async function changeRole(user, role) {
    try {
      await api(`/users/${user.id}`, { token, method: 'PATCH', body: JSON.stringify({ role }) });
      setError('');
      await load();
    } catch (reason) { setError(reason.message); }
  }

  async function resetPassword(user) {
    const password = window.prompt(`Enter a new password of at least 12 characters for ${user.email}:`);
    if (password === null) return;
    try {
      await api(`/users/${user.id}`, { token, method: 'PATCH', body: JSON.stringify({ password }) });
      setError('');
    } catch (reason) { setError(reason.message); }
  }

  async function changeEmail(user) {
    const email = window.prompt('Enter the verified email address for this account:', user.email);
    if (email === null || email.trim() === user.email) return;
    try {
      await api(`/users/${user.id}`, { token, method: 'PATCH', body: JSON.stringify({ email: email.trim() }) });
      setError('');
      await load();
    } catch (reason) { setError(reason.message); }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete the account for ${user.email}? Existing sales will be retained.`)) return;
    try {
      await api(`/users/${user.id}`, { token, method: 'DELETE' });
      setError('');
      await load();
    } catch (reason) { setError(reason.message); }
  }

  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h1>User management</h1><p className="muted">Create and manage the two supported account roles.</p></div></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <form className="panel product-form user-form" onSubmit={createUser}>
        <div><h2>Create cashier account</h2><p>New accounts created here are always cashiers.</p></div>
        <label>Email<input type="email" required maxLength="254" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Temporary password
          <div className="password-field">
            <input type={showPassword ? 'text' : 'password'} required minLength="12" maxLength="256" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} title={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.2 5.2A10.8 10.8 0 0112 4.7c5.2 0 9.2 4.7 9.2 7.3a9.5 9.5 0 01-2.1 3.5M6.2 6.2A10.7 10.7 0 002.8 12c0 2.6 4 7.3 9.2 7.3a9.8 9.8 0 004.1-.9" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.8 12c0-2.6 4-7.3 9.2-7.3s9.2 4.7 9.2 7.3-4 7.3-9.2 7.3S2.8 14.6 2.8 12z" />
                  <circle cx="12" cy="12" r="2.8" />
                </svg>
              )}
            </button>
          </div>
        </label>
        <button className="primary-button">Create user <span>＋</span></button>
      </form>
      <article className="panel table-panel"><div className="table-toolbar"><div><h2>System users</h2><p>{users.length} accounts</p></div></div>
        <div className="table-scroll"><table><thead><tr><th>EMAIL</th><th>ROLE</th><th>CREATED</th><th className="align-right">ACTIONS</th></tr></thead><tbody>
          {users.map((user) => {
            const isSelf = String(user.id) === String(currentUser.id);
            return <tr key={user.id}><td><strong>{user.email}</strong>{isSelf && <span className="you-tag">YOU</span>}</td><td><span className={`status-pill ${user.role === 'admin' ? 'admin-role' : 'completed'}`}>{user.role}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td><td className="align-right user-actions">
              <button className="text-button" onClick={() => changeEmail(user)}>Change email</button><button className="text-button" onClick={() => resetPassword(user)}>Reset password</button>
              {!isSelf && <>{user.role === 'admin' && <button className="text-button" onClick={() => changeRole(user, 'cashier')}>Make cashier</button>}<button className="text-button danger-text" onClick={() => deleteUser(user)}>Delete</button></>}
            </td></tr>;
          })}
          {users.length === 0 && <tr><td colSpan="4" className="table-empty">No users found.</td></tr>}
        </tbody></table></div>
      </article>
    </section>
  );
}
