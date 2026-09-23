import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

// Sidebar nav shell for the Accounting & Finance module.
// <Outlet /> renders the active sub-page (Chart of Accounts, Cash Book, etc.)

const NAV_ITEMS = [
  { to: 'chart-of-accounts', label: 'Chart of Accounts', icon: '📒' },
  { to: 'cash-book', label: 'Cash Book', icon: '💵' },
  { to: 'bank-book', label: 'Bank Book', icon: '🏦' },
  { to: 'journal-entry', label: 'Journal Entry', icon: '📝' },
  { to: 'expense-management', label: 'Expense Management', icon: '💸' },
  { to: 'income-entry', label: 'Income Entry', icon: '📥' },
  { to: 'gst-reports', label: 'GST Reports', icon: '🧾' },
  { to: 'profit-loss', label: 'Profit & Loss', icon: '📈' },
  { to: 'balance-sheet', label: 'Balance Sheet', icon: '⚖️' },
];

export default function AccountingLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer automatically whenever the route changes,
  // so navigating never leaves the sidebar covering the new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className={`accounting-shell${mobileOpen ? ' sidebar-open' : ''}`}>
      <header className="accounting-topbar">
        <button
          type="button"
          className="accounting-hamburger"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
        <span>Accounting &amp; Finance</span>
      </header>

      {mobileOpen && (
        <div
          className="accounting-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className="accounting-sidebar">
        <div className="sidebar-title">Accounting &amp; Finance</div>
        <Link to="/app/admin" className="sidebar-link sidebar-home-link">
          🏠 <span>Home (Admin Dashboard)</span>
        </Link>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="accounting-content">
        <Outlet />
      </main>
    </div>
  );
}
