const adminNavItems = [
  ['Overview', 'overview', 'overview'],
  ['Point of sale', 'overview', 'dashboard'],
  ['Transactions', 'transactions', 'transactions'],
  ['Products & inventory', 'products', 'products'],
  ['Sales analytics', 'reports', 'reports'],
  ['Users', 'users', 'users'],
  ['Audit log', 'audit', 'audit'],
  ['API activity', 'activity', 'integration'],
  ['Settings', 'settings', 'settings']
];
const cashierNavItems = [
  ['Point of sale', 'overview', 'dashboard'],
  ['Transaction history', 'transactions', 'transactions'],
  ['Products', 'products', 'products']
];

const iconShapes = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  transactions: <><path d="M7 7h13l-3-3" /><path d="M17 17H4l3 3" /><path d="M20 7l-4 4" /><path d="m4 17 4-4" /></>,
  products: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v9" /></>,
  reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6" /></>,
  audit: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-4.8" /></>,
  activity: <><path d="M4 7h15M15 3l4 4-4 4M20 17H5m4-4-4 4 4 4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.5-2.6 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.5-2.6 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h3l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.5 2.6-1.4 1.1a7 7 0 0 1 0 1.7Z" /></>
};

function NavIcon({ name }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{iconShapes[name]}</svg>;
}

export default function Shell({ user, page, setPage, onLogout, children }) {
  const isAdmin = user.role === 'admin';
  const menuItems = isAdmin ? adminNavItems : cashierNavItems;
  const menuLabel = isAdmin ? 'ADMIN MENU' : 'CASHIER MENU';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">R</div><div><strong>RetailFlow</strong><small>RETAIL &amp; E-COMMERCE</small></div></div>
        <p className="nav-label">{menuLabel}</p>
        <nav aria-label={menuLabel}>{menuItems.map(([label, icon, key]) => (
              <button key={key} className={`nav-item ${page === key ? 'selected' : ''}`} onClick={() => setPage(key)}>
                <span className="nav-icon"><NavIcon name={icon} /></span>{label}{page === key && <i />}
              </button>
        ))}</nav>
        <div className="sidebar-bottom">
          <div className="secure-tag"><span>✓</span><div><strong>PCI DSS governance</strong><small>No cardholder data stored</small></div></div>
          <div className="user-profile"><div className="avatar">{user.email.slice(0, 1).toUpperCase()}</div><div className="user-meta"><strong>{user.email}</strong><small>{user.role}</small></div><button className="logout" title="Sign out" onClick={onLogout}>↪</button></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div>POS data source <span className="connection-label">Real-Time APIs</span></div><div className="topbar-right"><span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><div className="avatar small">{user.email.slice(0, 1).toUpperCase()}</div></div></header>
        {children}
        <footer className="footer-note">© {new Date().getFullYear()} RetailFlow <span>•</span> No cardholder data stored <span>•</span> PCI DSS is a governance requirement, not a certification claim</footer>
      </main>
    </div>
  );
}
