import { useState } from 'react';

export default function Login({ onLogin, busy, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={(event) => { event.preventDefault(); onLogin(email, password); }}>
        <div className="brand-mark">R</div>
        <p className="eyebrow">RETAIL OPERATIONS</p>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to review sales and POS activity.</p>
        <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <button className="primary-button full-width" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span>→</span></button>
        <p className="login-note">Access is provisioned by your administrator.</p>
      </form>
    </main>
  );
}
