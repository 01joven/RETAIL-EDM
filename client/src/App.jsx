import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from './api/client.js';
import Login from './components/Login.jsx';
import Shell from './components/Shell.jsx';
import Unauthorized from './components/Unauthorized.jsx';

const Overview = lazy(() => import('./components/Overview.jsx'));
const CashierDashboard = lazy(() => import('./components/CashierDashboard.jsx'));
const Transactions = lazy(() => import('./components/Transactions.jsx'));
const Products = lazy(() => import('./components/Products.jsx'));
const Reports = lazy(() => import('./components/Reports.jsx'));
const UserManagement = lazy(() => import('./components/UserManagement.jsx'));
const AuditLog = lazy(() => import('./components/AuditLog.jsx'));
const IntegrationMonitor = lazy(() => import('./components/IntegrationMonitor.jsx'));

const SESSION_KEY = 'retail-pos-session';
const PAGE_KEY = 'retail-pos-page';

function readStoredSession() {
  const stored = window.sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    const saved = JSON.parse(stored);
    if (typeof saved.accessToken === 'string' && saved.accessToken &&
        saved.user && (typeof saved.user.id === 'number' || typeof saved.user.id === 'string') &&
        typeof saved.user.email === 'string' &&
        ['admin', 'cashier'].includes(saved.user.role)) {
      return saved;
    }
  } catch {}
  window.sessionStorage.removeItem(SESSION_KEY);
  return null;
}

export default function App() {
  const [session, setSession] = useState(readStoredSession);
  const [page, setPage] = useState(() => window.sessionStorage.getItem(PAGE_KEY) || 'overview');
  const [restoring, setRestoring] = useState(() => Boolean(window.sessionStorage.getItem(SESSION_KEY)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const accessToken = session?.accessToken;

  useEffect(() => {
    window.sessionStorage.setItem(PAGE_KEY, page);
  }, [page]);

  useEffect(() => {
    if (!accessToken) return undefined;
    let active = true;
    api('/auth/me', { token: accessToken })
      .then(({ user }) => {
        if (active) {
          setSession((current) => current?.accessToken === accessToken ? { ...current, user } : current);
          setError('');
        }
      })
      .catch((reason) => {
        if (!active) return;
        if (reason.status === 401) {
          window.sessionStorage.removeItem(SESSION_KEY);
          setSession((current) => current?.accessToken === accessToken ? null : current);
          setPage('overview');
          setError('');
        }
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => { active = false; };
  }, [accessToken]);

  async function login(email, password) {
    setBusy(true);
    setError('');
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
      setSession(result);
      setPage(result.user.role === 'cashier' ? 'dashboard' : 'overview');
      setError('');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST', token: session.accessToken });
    } catch {}
    window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setPage('overview');
    setError('');
  }
  if (restoring) return <div className="loading-panel">Loading workspace…</div>;
  if (!session) return <Login onLogin={login} busy={busy} error={error} />;
  const allowedPages = session.user.role === 'admin'
    ? ['overview', 'dashboard', 'transactions', 'products', 'reports', 'users', 'audit', 'integration']
    : ['dashboard', 'transactions', 'products'];
  const canAccessPage = allowedPages.includes(page);
  const returnPage = session.user.role === 'cashier' ? 'dashboard' : 'overview';
  const content = {
    overview: <Overview token={session.accessToken} onNavigate={setPage} />,
    dashboard: <CashierDashboard token={session.accessToken} user={session.user} />,
    transactions: <Transactions token={session.accessToken} user={session.user} />,
    products: <Products token={session.accessToken} user={session.user} />,
    reports: <Reports token={session.accessToken} />,
    users: <UserManagement token={session.accessToken} currentUser={session.user} />,
    audit: <AuditLog token={session.accessToken} />,
    integration: <IntegrationMonitor token={session.accessToken} />
  }[page];
  return <Shell user={session.user} page={page} setPage={setPage} onLogout={logout}><Suspense fallback={<div className="loading-panel">Loading workspace…</div>}>{canAccessPage ? content : <Unauthorized onReturn={() => setPage(returnPage)} />}</Suspense></Shell>;
}
