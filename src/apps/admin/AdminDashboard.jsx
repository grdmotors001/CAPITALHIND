import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { clearCurrentUser } from '../../utils/session';
import ManageStaff from './ManageStaff';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  function logout() {
    clearCurrentUser();
    fetch('/admin/logout.php', { credentials: 'include' }).finally(() => navigate('/login', { replace: true }));
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><img src="/logo.png" alt="Capital Hind Finance" /><div><strong>Capital Hind</strong><span>Finance</span></div></div>
        <nav>
          <Link className={location.pathname === '/app/admin' ? 'active' : ''} to="/app/admin">⌂ <span>Dashboard</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/staff') ? 'active' : ''} to="/app/admin/staff">♟ <span>Manage Staff</span></Link>
          <Link to="/app/accounting">▦ <span>Accounting</span></Link>
        </nav>
        <button className="admin-logout" onClick={logout}>↪ Logout</button>
      </aside>
      <main className="admin-main">
        <Routes>
          <Route index element={<AdminHome />} />
          <Route path="staff" element={<ManageStaff />} />
        </Routes>
      </main>
    </div>
  );
}

function AdminHome() {
  return (
    <div className="admin-page">
      <div className="admin-page-head"><div><div className="admin-eyebrow">CONTROL CENTER</div><h1>Admin Dashboard</h1><p>Manage your staff accounts and administration tools.</p></div></div>
      <div className="admin-home-grid">
        <Link to="staff" className="admin-home-card"><span>♟</span><div><h3>Manage Staff</h3><p>Add staff/admin accounts, update login contacts and remove accounts.</p></div><b>→</b></Link>
        <Link to="/app/accounting" className="admin-home-card"><span>▦</span><div><h3>Accounting</h3><p>Open the accounting and finance module.</p></div><b>→</b></Link>
      </div>
    </div>
  );
}
