import { useState } from 'react';
import { api } from '../api/client.js';

export default function Login({ onLogin, busy, error }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  async function requestCode(event) {
    event.preventDefault();
    setRecoveryBusy(true);
    setRecoveryError('');
    setRecoveryMessage('');
    try {
      const result = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setRecoveryMessage(result.message);
      setMode('reset');
    } catch (reason) {
      setRecoveryError(reason.message);
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match');
      return;
    }
    setRecoveryBusy(true);
    setRecoveryError('');
    setRecoveryMessage('');
    try {
      const result = await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, password: newPassword })
      });
      setPassword('');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryMessage(result.message);
      setMode('login');
    } catch (reason) {
      setRecoveryError(reason.message);
    } finally {
      setRecoveryBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">R</div>
        <p className="eyebrow">RETAIL OPERATIONS</p>
        {mode === 'login' && <>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to review sales and POS activity.</p>
          <form onSubmit={(event) => { event.preventDefault(); onLogin(email, password); }}>
            <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {error && <div className="error-banner" role="alert">{error}</div>}
            {recoveryMessage && <div className="success-banner" role="status">{recoveryMessage}</div>}
            <button className="primary-button full-width" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span>→</span></button>
          </form>
          <button type="button" className="link-button forgot-link" onClick={() => { setRecoveryError(''); setRecoveryMessage(''); setMode('forgot'); }}>Forgot password?</button>
          <p className="login-note">Access is provisioned by your administrator.</p>
        </>}
        {mode === 'forgot' && <>
          <h1>Forgot password?</h1>
          <p className="muted">We’ll send a verification code to the email address on your account.</p>
          <form onSubmit={requestCode}>
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            {recoveryError && <div className="error-banner" role="alert">{recoveryError}</div>}
            <button className="primary-button full-width" disabled={recoveryBusy}>{recoveryBusy ? 'Sending code…' : 'Send verification code'} <span>→</span></button>
          </form>
          <button type="button" className="link-button forgot-link" onClick={() => { setRecoveryError(''); setMode('login'); }}>Back to sign in</button>
        </>}
        {mode === 'reset' && <>
          <h1>Reset password</h1>
          <p className="muted">Enter the six-digit code sent to your registered email.</p>
          {recoveryMessage && <div className="success-banner" role="status">{recoveryMessage}</div>}
          <form onSubmit={resetPassword}>
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Verification code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
            <label>New password<input type="password" autoComplete="new-password" minLength="12" maxLength="256" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" minLength="12" maxLength="256" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
            {recoveryError && <div className="error-banner" role="alert">{recoveryError}</div>}
            <button className="primary-button full-width" disabled={recoveryBusy}>{recoveryBusy ? 'Resetting password…' : 'Reset password'} <span>→</span></button>
          </form>
          <button type="button" className="link-button forgot-link" onClick={() => { setRecoveryError(''); setRecoveryMessage(''); setMode('forgot'); }}>Request another code</button>
        </>}
      </section>
    </main>
  );
}
