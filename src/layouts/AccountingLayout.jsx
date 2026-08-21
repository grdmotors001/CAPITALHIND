import { NavLink, Outlet } from 'react-router-dom';

// WIREFRAME: sidebar nav shell for the Accounting & Finance module.
// <Outlet /> renders the active sub-page (Chart of Accounts, Cash Book, etc.)

const NAV_ITEMS = [
  { to: 'chart-of-accounts', label: 'Chart of Accounts' },
  { to: 'cash-book', label: 'Cash Book' },
  { to: 'bank-book', label: 'Bank Book' },
  { to: 'journal-entry', label: 'Journal Entry' },
  { to: 'expense-management', label: 'Expense Management' },
  { to: 'income-entry', label: 'Income Entry' },
  { to: 'gst-reports', label: 'GST Reports' },
  { to: 'profit-loss', label: 'Profit & Loss' },
  { to: 'balance-sheet', label: 'Balance Sheet' },
];

export default function AccountingLayout() {
  return (
    <div className="accounting-shell">
      <aside className="accounting-sidebar">
        <div className="sidebar-title">Accounting & Finance</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              {item.label}
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
