import { lazy, Suspense, useState } from 'react';
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
const Settings = lazy(() => import('./components/Settings.jsx'));

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function login(email, password) {
    setBusy(true);
    setError('');
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setSession(result);
      setPage(result.user.role === 'cashier' ? 'dashboard' : 'overview');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }
  if (!session) return <Login onLogin={login} busy={busy} error={error} />;
  const allowedPages = session.user.role === 'admin'
    ? ['overview', 'transactions', 'products', 'reports', 'users', 'settings']
    : ['dashboard', 'transactions', 'products'];
  const canAccessPage = allowedPages.includes(page);
  const returnPage = session.user.role === 'cashier' ? 'dashboard' : 'overview';
  const content = {
    overview: <Overview token={session.accessToken} onNavigate={setPage} />,
    dashboard: <CashierDashboard token={session.accessToken} />,
    transactions: <Transactions token={session.accessToken} />,
    products: <Products token={session.accessToken} user={session.user} />,
    reports: <Reports token={session.accessToken} />,
    users: <UserManagement token={session.accessToken} currentUser={session.user} />,
    settings: <Settings token={session.accessToken} />
  }[page];
  return <Shell user={session.user} page={page} setPage={setPage} onLogout={() => { setSession(null); setPage('overview'); }}><Suspense fallback={<div className="loading-panel">Loading workspace…</div>}>{canAccessPage ? content : <Unauthorized onReturn={() => setPage(returnPage)} />}</Suspense></Shell>;
}
