import { useState } from 'react';
import { api } from '../api/client.js';

function PasswordToggle({ visible, onToggle }) {
  return (
    <button
      type="button"
      className="password-toggle"
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      title={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? (
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
  );
}

export default function Login({ onLogin, busy, error }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        <p className="eyebrow">RETAIL &amp; E-COMMERCE MANAGEMENT</p>
        {mode === 'login' && <>
          <h1>Welcome back</h1>
          <div className="login-context" aria-label="System scope">
          </div>
          <form onSubmit={(event) => { event.preventDefault(); onLogin(email, password); }}>
            <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password
              <div className="password-field">
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />
              </div>
            </label>
            {error && <div className="error-banner" role="alert">{error}</div>}
            {recoveryMessage && <div className="success-banner" role="status">{recoveryMessage}</div>}
            <button className="primary-button full-width" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span>→</span></button>
          </form>
          <button type="button" className="link-button forgot-link" onClick={() => { setRecoveryError(''); setRecoveryMessage(''); setMode('forgot'); }}>Forgot password?</button>
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
            <label>New password
              <div className="password-field">
                <input type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" minLength="12" maxLength="256" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                <PasswordToggle visible={showNewPassword} onToggle={() => setShowNewPassword((visible) => !visible)} />
              </div>
            </label>
            <label>Confirm new password
              <div className="password-field">
                <input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" minLength="12" maxLength="256" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                <PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((visible) => !visible)} />
              </div>
            </label>
            {recoveryError && <div className="error-banner" role="alert">{recoveryError}</div>}
            <button className="primary-button full-width" disabled={recoveryBusy}>{recoveryBusy ? 'Resetting password…' : 'Reset password'} <span>→</span></button>
          </form>
          <button type="button" className="link-button forgot-link" onClick={() => { setRecoveryError(''); setRecoveryMessage(''); setMode('forgot'); }}>Request another code</button>
        </>}
      </section>
    </main>
  );
}
