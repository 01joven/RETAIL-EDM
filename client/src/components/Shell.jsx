const adminNavItems = [
  ['Overview', '▦', 'overview'],
  ['Transactions', '↗', 'transactions'],
  ['Products & inventory', '▤', 'products'],
  ['Sales reports', '▥', 'reports'],
  ['Users', '♙', 'users'],
  ['Settings', '⚙', 'settings']
];
const cashierNavItems = [
  ['Point of sale', '▦', 'dashboard'],
  ['My transactions', '↗', 'transactions'],
  ['Products', '▤', 'products']
];

export default function Shell({ user, page, setPage, onLogout, children }) {
  const navItems = user.role === 'admin' ? adminNavItems : cashierNavItems;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">R</div><div><strong>RetailFlow</strong><small>POS INTELLIGENCE</small></div></div>
        <p className="nav-label">WORKSPACE</p>
        <nav>{navItems.map(([label, icon, key]) => (
          <button key={key} className={`nav-item ${page === key ? 'selected' : ''}`} onClick={() => setPage(key)}>
            <span className="nav-icon">{icon}</span>{label}{page === key && <i />}
          </button>
        ))}</nav>
        <div className="sidebar-bottom">
          <div className="secure-tag"><span>✓</span><div><strong>Secure workspace</strong><small>PCI-aware data handling</small></div></div>
          <div className="user-profile"><div className="avatar">{user.email.slice(0, 1).toUpperCase()}</div><div className="user-meta"><strong>{user.email}</strong><small>{user.role}</small></div><button className="logout" title="Sign out" onClick={onLogout}>↪</button></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div><span className="live-dot" /> POS API <span className="connection-label">Connected</span></div><div className="topbar-right"><span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><div className="avatar small">{user.email.slice(0, 1).toUpperCase()}</div></div></header>
        {children}
        <footer className="footer-note">© {new Date().getFullYear()} RetailFlow <span>•</span> Sales analytics without payment-card data</footer>
      </main>
    </div>
  );
}
