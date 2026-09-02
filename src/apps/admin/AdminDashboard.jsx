import ProfileMenu from '../../components/ProfileMenu';
import CollectionActivity from '../../components/CollectionActivity';
import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { clearCurrentUser } from '../../utils/session';
import { clearAdminToken, exportCibilData, getDashboardStats } from './api';
import ManageAccounts from './ManageAccounts';
import AssignApplications from './AssignApplications';
import CreateLoan from './CreateLoan';
import MastersHome from './masters/MastersHome';
import ManageHP from './masters/ManageHP';
import ManageVehicleModels from './masters/ManageVehicleModels';
import ManageLoanTypes from './masters/ManageLoanTypes';
import ManageOEM from './masters/ManageOEM';
import ManageBatteries from './masters/ManageBatteries';
import Receipts from './Receipts';
import PaymentVouchers from './PaymentVouchers';
import LoanCases from './LoanCases';
import Applicants from './Applicants';
import RepoCases from './RepoCases';
import Reports from './Reports';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  function logout() {
    // Admin auth is now a stateless JWT (see src/apps/admin/api.js), not a
    // PHP session cookie, so logout is just discarding the token client-side.
    clearAdminToken();
    clearCurrentUser();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><img src="/logo.png" alt="Capital Hind Finance" /><div><strong>Capital Hind</strong><span>Finance</span></div></div>
        <nav>
          <Link className={location.pathname === '/app/admin' ? 'active' : ''} to="/app/admin">⌂ <span>Dashboard</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/accounts') ? 'active' : ''} to="/app/admin/accounts">♟ <span>Manage Accounts</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/assign') ? 'active' : ''} to="/app/admin/assign">➤ <span>Assign Applications</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/create-loan') ? 'active' : ''} to="/app/admin/create-loan">▣ <span>Create Loan</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/payment-vouchers') ? 'active' : ''} to="/app/admin/payment-vouchers">₹ <span>Payment Vouchers</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/receipts') ? 'active' : ''} to="/app/admin/receipts">▤ <span>Receipts</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/applicants') ? 'active' : ''} to="/app/admin/applicants">◉ <span>Applicants</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/loan-cases') ? 'active' : ''} to="/app/admin/loan-cases">▤ <span>Loan Cases</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/repo-cases') ? 'active' : ''} to="/app/admin/repo-cases">🚗 <span>Repo</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/reports') ? 'active' : ''} to="/app/admin/reports">▤ <span>Reports</span></Link>
          <div className="nav-section-label"><span>Masters</span></div>
          <Link className={location.pathname.startsWith('/app/admin/masters/oem') ? 'active' : ''} to="/app/admin/masters/oem">🏭 <span>OEM</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/masters/hp') ? 'active' : ''} to="/app/admin/masters/hp">⚖ <span>HP (Hypothecation)</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/masters/vehicle-models') ? 'active' : ''} to="/app/admin/masters/vehicle-models">🏍 <span>Vehicle Model</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/masters/loan-types') ? 'active' : ''} to="/app/admin/masters/loan-types">₹ <span>Loan Type</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/masters/batteries') ? 'active' : ''} to="/app/admin/masters/batteries">🔋 <span>Battery Master</span></Link>
          <Link className={location.pathname.startsWith('/app/accounting/expense-management') ? 'active' : ''} to="/app/accounting/expense-management">💸 <span>Expense Master</span></Link>
          <Link to="/app/accounting">▦ <span>Accounting</span></Link>
        </nav>
        <div style={{ padding: '12px 16px' }}><ProfileMenu compact /></div>
        <button className="admin-logout" onClick={logout}>↪ Logout</button>
      </aside>
      <main className="admin-main">
        <Routes>
          <Route index element={<AdminHome />} />
          <Route path="accounts" element={<ManageAccounts />} />
          <Route path="assign" element={<AssignApplications />} />
          <Route path="create-loan" element={<CreateLoan />} />
          <Route path="payment-vouchers" element={<PaymentVouchers />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="applicants" element={<Applicants />} />
          <Route path="loan-cases" element={<LoanCases />} />
          <Route path="repo-cases" element={<RepoCases />} />
          <Route path="reports" element={<Reports />} />
          <Route path="masters" element={<MastersHome />} />
          <Route path="masters/oem" element={<ManageOEM />} />
          <Route path="masters/hp" element={<ManageHP />} />
          <Route path="masters/vehicle-models" element={<ManageVehicleModels />} />
          <Route path="masters/loan-types" element={<ManageLoanTypes />} />
          <Route path="masters/batteries" element={<ManageBatteries />} />
        </Routes>
      </main>
    </div>
  );
}

function AdminHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getDashboardStats().then(setData).catch(e => setError(e.message || 'Could not load dashboard')); }, []);
  const max = Math.max(1, ...(data?.months || []).map(m => Math.max(m.applied,m.approved,m.rejected,m.disbursement,m.seized)));
  return (
    <div className="admin-page">
      <div className="admin-page-head"><div><div className="admin-eyebrow">CONTROL CENTER</div><h1>Admin Dashboard</h1><p>Loan workflow, collection and staff payment overview.</p></div></div>
      {error && <div className="admin-alert error">⚠ {error}</div>}
      <div className="admin-home-grid">
        <Link to="accounts" className="admin-home-card"><span>♟</span><div><h3>Manage Accounts</h3><p>Dealer aur sabhi Team Users — Admin, Field Executive, Tele Caller, DO aur Team Leader — ek hi jagah manage karein.</p></div><b>→</b></Link>
        <Link to="assign" className="admin-home-card"><span>➤</span><div><h3>Assign Applications</h3><p>CIBIL score check karke Field Executive ko FI assign karein.</p></div><b>→</b></Link>
        <Link to="create-loan" className="admin-home-card"><span>▣</span><div><h3>Create Loan</h3><p>Approved application se complete loan entry create karein.</p></div><b>→</b></Link>
        <Link to="receipts" className="admin-home-card"><span>▤</span><div><h3>Receipts</h3><p>Loan select karke amount/date se receipt entry aur loan detail PDF print karein.</p></div><b>→</b></Link>
        <Link to="payment-vouchers" className="admin-home-card"><span>₹</span><div><h3>Payment Vouchers</h3><p>Tele Caller, FE aur other incentives/payments record karein.</p></div><b>→</b></Link>
        <Link to="loan-cases" className="admin-home-card"><span>▤</span><div><h3>Loan Cases</h3><p>Active, suit filed, vehicle seized aur file/ledger details manage karein.</p></div><b>→</b></Link>
        <Link to="masters" className="admin-home-card"><span>☰</span><div><h3>Masters</h3><p>HP, Vehicle Model and Loan Type master data.</p></div><b>→</b></Link>
        <Link to="reports" className="admin-home-card"><span>▤</span><div><h3>Reports</h3><p>Day Book, collections, expenses, NOC, repo and loan ledger reports.</p></div><b>→</b></Link>
        <Link to="/app/accounting" className="admin-home-card"><span>▦</span><div><h3>Accounting</h3><p>Open accounting and finance module.</p></div><b>→</b></Link>
      </div>
      <section className="admin-card" style={{ marginTop: 24 }}>
        <div className="admin-card-title"><div><h2>Collection & Loan Dashboard</h2><span>Monthly applied, approved, rejected, disbursement and vehicle seizure</span></div></div>
        <div className="dealer-kpis" style={{ marginTop: 16 }}>
          <div className="dealer-kpi"><span>Active Cases</span><strong>{data?.active_cases ?? '—'}</strong><small>Case status active</small></div>
          <div className="dealer-kpi"><span>Vehicle Seized</span><strong>{data?.vehicle_seized_total ?? '—'}</strong><small>Total seized cases</small></div>
          <div className="dealer-kpi"><span>Total Approved</span><strong>{data?.approved_total ?? '—'}</strong><small>Current approved</small></div>
          <div className="dealer-kpi"><span>Total Disbursed</span><strong>{data?.disbursed_total ?? '—'}</strong><small>Current disbursed</small></div>
        </div>
        <AdminCharts months={data?.months || []} />
        <div className="admin-month-grid">
          {(data?.months || []).map(m => <div className="admin-month-card" key={m.month}><b>{m.month}</b><div><span>Applied <strong>{m.applied}</strong></span><i style={{width:`${Math.max(6,m.applied/max*100)}%`}} /></div><div><span>Approved <strong>{m.approved}</strong></span><i style={{width:`${Math.max(6,m.approved/max*100)}%`}} /></div><div><span>Rejected <strong>{m.rejected}</strong></span><i style={{width:`${Math.max(6,m.rejected/max*100)}%`}} /></div><div><span>Disbursed <strong>{m.disbursement}</strong></span><i style={{width:`${Math.max(6,m.disbursement/max*100)}%`}} /></div><div><span>Vehicle seized <strong>{m.seized}</strong></span><i style={{width:`${Math.max(6,m.seized/max*100)}%`}} /></div></div>)}
        </div>
      </section>
      <CollectionActivity />
      <ExportCibilCard />
    </div>
  );
}

function AdminCharts({ months }) {
  const max = Math.max(1, ...(months || []).map(m => Math.max(m.applied || 0, m.approved || 0, m.disbursement || 0)));
  const last = months?.[months.length - 1] || {};
  const applied = Number(last.applied || 0), approved = Number(last.approved || 0), disbursed = Number(last.disbursement || 0);
  const points = (months || []).map((m, i) => {
    const x = months.length <= 1 ? 50 : (i / (months.length - 1)) * 100;
    const y = 92 - (Number(m.disbursement || 0) / max) * 78;
    return `${x},${y}`;
  }).join(' ');
  const circumference = 2 * Math.PI * 38;
  const donutTotal = Math.max(1, applied + approved + disbursed);
  const approvedPct = (approved / donutTotal) * 100;
  const disbursedPct = (disbursed / donutTotal) * 100;
  return <div className="admin-chart-grid">
    <section className="admin-chart-card"><div className="admin-chart-head"><div><h3>Monthly Applications</h3><span>Applied vs approved</span></div><b>{applied}</b></div><div className="bar-chart">{(months || []).map(m => <div className="bar-group" key={m.month}><div className="bar-pair"><i style={{height:`${Math.max(4,(Number(m.applied||0)/max)*100)}%`}}></i><em style={{height:`${Math.max(4,(Number(m.approved||0)/max)*100)}%`}}></em></div><small>{m.month.split(' ')[0]}</small></div>)}</div><div className="chart-legend"><span><i className="legend-a"/>Applied</span><span><i className="legend-b"/>Approved</span></div></section>
    <section className="admin-chart-card"><div className="admin-chart-head"><div><h3>Disbursement Trend</h3><span>Month-wise disbursed cases</span></div><b>{disbursed}</b></div><div className="line-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Disbursement trend"><polyline points="0,92 100,92" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="1"/><polyline points={points || '0,92 100,92'} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg><div className="line-labels">{(months || []).map(m=><span key={m.month}>{m.month.split(' ')[0]}</span>)}</div></div></section>
    <section className="admin-chart-card"><div className="admin-chart-head"><div><h3>Loan Status Mix</h3><span>Latest month composition</span></div><b>{donutTotal}</b></div><div className="donut-wrap"><div className="donut" style={{background:`conic-gradient(var(--maroon) 0 ${approvedPct}%, var(--orange) ${approvedPct}% ${approvedPct+disbursedPct}%, #e9e2df ${approvedPct+disbursedPct}% 100%)`}}><strong>{approved + disbursed}</strong><small>approved + disbursed</small></div><div className="donut-list"><span><i className="dot-a"/>Approved <b>{approved}</b></span><span><i className="dot-b"/>Disbursed <b>{disbursed}</b></span><span><i className="dot-c"/>Applied / other <b>{Math.max(0,donutTotal-approved-disbursed)}</b></span></div></div></section>
  </div>;
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function ExportCibilCard() {
  const [asOnDate, setAsOnDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleExport(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { filename } = await exportCibilData({ asOnDate });
      setMessage(`Downloaded ${filename}`);
    } catch (err) {
      setError(err.message || 'Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-card" style={{ marginTop: 24 }}>
      <div className="admin-card-title">
        <h2>Export CIBIL Data</h2>
        <span>Live loan applications, in CIBIL TUDF upload format</span>
      </div>
      <form className="staff-form" onSubmit={handleExport}>
        {error && <div className="admin-alert error">{error}</div>}
        {message && <div className="admin-alert success">{message}</div>}
        <div className="form-grid">
          <div>
            <label htmlFor="as-on-date">As on Date <span>(becomes CIBIL "Date Reported")</span></label>
            <input
              id="as-on-date"
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              required
            />
          </div>
        </div>
        <button type="submit" className="admin-btn" disabled={loading}>
          {loading ? 'Exporting…' : '⭳ Export CIBIL Data (.xlsx)'}
        </button>
      </form>
    </div>
  );
}
