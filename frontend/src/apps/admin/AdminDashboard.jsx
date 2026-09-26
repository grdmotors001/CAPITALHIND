import ProfileMenu from '../../components/ProfileMenu';
import CollectionActivity from '../../components/CollectionActivity';
import ThemeToggle from '../../components/ThemeToggle';
import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { clearCurrentUser } from '../../utils/session';
import { getStoredSidebarCollapsed, setSidebarCollapsed } from '../../utils/theme';
import { clearAdminToken, exportCibilData, getDashboardStats, getPaymentReceivable } from './api';
import ManageAccounts from './ManageAccounts';
import AssignApplications from './AssignApplications';
import CreateLoan from './CreateLoan';
import MastersHome from './masters/MastersHome';
import ManageHP from './masters/ManageHP';
import ManageOEM from './masters/ManageOEM';
import ManageBatteries from './masters/ManageBatteries';
import Receipts from './Receipts';
import PaymentVouchers from './PaymentVouchers';
import LoanCases from './LoanCases';
import Applicants from './Applicants';
import RepoCases from './RepoCases';
import Reports from './Reports';
import AdminTools from './AdminTools';
import CollectionRisk from './CollectionRisk';
import ManualCreateLoan from './ManualCreateLoan';
import LoanApplications from './LoanApplications';
import PaymentReceivable from './PaymentReceivable';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(getStoredSidebarCollapsed());

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      setSidebarCollapsed(next);
      return next;
    });
  }

  function logout() {
    // Admin auth is now a stateless JWT (see src/apps/admin/api.js), not a
    // PHP session cookie, so logout is just discarding the token client-side.
    clearAdminToken();
    clearCurrentUser();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${collapsed ? ' collapsed' : ''}`}>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
        <div className="admin-brand"><img src="/logo.png" alt="Capital Hind Finance" /><div><strong>Capital Hind</strong><span>Finance</span></div></div>
        <nav>
          <Link className={location.pathname === '/app/admin' ? 'active' : ''} to="/app/admin">⌂ <span>Dashboard</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/accounts') ? 'active' : ''} to="/app/admin/accounts">♟ <span>Manage Accounts</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/assign') ? 'active' : ''} to="/app/admin/assign">➤ <span>Assign Applications</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/create-loan') ? 'active' : ''} to="/app/admin/create-loan">▣ <span>Create Loan</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/manual-create-loan') ? 'active' : ''} to="/app/admin/manual-create-loan">✚ <span>Manual Create Loan</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/payment-receivable') ? 'active' : ''} to="/app/admin/payment-receivable">₹ <span>Payment Receivable</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/payment-vouchers') ? 'active' : ''} to="/app/admin/payment-vouchers">₹ <span>Payment Vouchers</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/receipts') ? 'active' : ''} to="/app/admin/receipts">▤ <span>Receipts</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/import') ? 'active' : ''} to="/app/admin/import">⇧ <span>Data Import</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/applicants') ? 'active' : ''} to="/app/admin/applicants">◉ <span>Applicants</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/loan-applications') ? 'active' : ''} to="/app/admin/loan-applications">📋 <span>Loan Application</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/loan-cases') ? 'active' : ''} to="/app/admin/loan-cases">▤ <span>Loan Cases</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/repo-cases') ? 'active' : ''} to="/app/admin/repo-cases">🚗 <span>Repo</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/reports') ? 'active' : ''} to="/app/admin/reports">▤ <span>Reports</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/collection-risk') ? 'active' : ''} to="/app/admin/collection-risk">⚠ <span>Collection & Risk</span></Link>
          <div className="nav-section-label"><span>Masters</span></div>
          <Link className={location.pathname.startsWith('/app/admin/masters/oem') ? 'active' : ''} to="/app/admin/masters/oem">🏭 <span>OEM</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/masters/hp') ? 'active' : ''} to="/app/admin/masters/hp">⚖ <span>HP (Hypothecation)</span></Link>
          <Link className={location.pathname.startsWith('/app/admin/masters/batteries') ? 'active' : ''} to="/app/admin/masters/batteries">🔋 <span>Battery Master</span></Link>
          <Link className={location.pathname.startsWith('/app/accounting/expense-management') ? 'active' : ''} to="/app/accounting/expense-management">💸 <span>Expense Master</span></Link>
          <Link to="/app/accounting">▦ <span>Accounting</span></Link>
        </nav>
        <div style={{ padding: '12px 16px' }}><ProfileMenu compact /></div>
        <button className="admin-logout" onClick={logout}><span>↪</span><span> Logout</span></button>
        <ThemeToggle inline />
      </aside>
      <nav className="admin-mobile-nav" aria-label="Admin mobile navigation">
        <Link to="/app/admin">⌂<span>Home</span></Link>
        <Link to="/app/admin/accounts">♟<span>Accounts</span></Link>
        <Link to="/app/admin/assign">➤<span>Assign</span></Link>
        <Link to="/app/admin/receipts">▤<span>Receipts</span></Link>
        <button type="button" onClick={() => {
          const el = document.querySelector('.profile-trigger');
          if (el) el.click();
        }}>◉<span>Profile</span></button>
      </nav>
      <main className="admin-main">
        <Routes>
          <Route index element={<AdminHome />} />
          <Route path="accounts" element={<ManageAccounts />} />
          <Route path="assign" element={<AssignApplications />} />
          <Route path="create-loan" element={<CreateLoan />} />
          <Route path="manual-create-loan" element={<ManualCreateLoan />} />
          <Route path="payment-receivable" element={<PaymentReceivable />} />
          <Route path="payment-vouchers" element={<PaymentVouchers />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="import" element={<AdminTools />} />
          <Route path="applicants" element={<Applicants />} />
          <Route path="loan-applications" element={<LoanApplications />} />
          <Route path="loan-cases" element={<LoanCases />} />
          <Route path="repo-cases" element={<RepoCases />} />
          <Route path="reports" element={<Reports />} />
          <Route path="collection-risk" element={<CollectionRisk />} />
          <Route path="masters" element={<MastersHome />} />
          <Route path="masters/oem" element={<ManageOEM />} />
          <Route path="masters/hp" element={<ManageHP />} />
          <Route path="masters/batteries" element={<ManageBatteries />} />
        </Routes>
      </main>
    </div>
  );
}

function AdminHome() {
  const [data,setData]=useState(null),[receivable,setReceivable]=useState(null),[error,setError]=useState('');
  async function load(){
    setError('');
    try{
      const [d,r]=await Promise.all([getDashboardStats(),getPaymentReceivable()]);
      setData(d); setReceivable(r);
    }catch(e){setError(e.message||'Could not load dashboard');}
  }
  useEffect(()=>{load()},[]);
  const cards=[
    ['loan-applications','📋','Loan Applications','Complete application pipeline and current workflow status.'],
    ['assign','➤','Assign Applications','Assign FI/Field Executive and continue the approval workflow.'],
    ['payment-receivable','₹','Payment Receivable','Outstanding EMI, overdue and today\'s receivable amount.'],
    ['receipts','▤','Receipts','Record customer payments and print receipts.'],
    ['payment-vouchers','₹','Payment Vouchers','Record staff incentives and other payment vouchers.'],
    ['loan-cases','▤','Loan Cases','Manage active cases, file/ledger and collection status.'],
    ['repo-cases','🚗','Repo','Manage vehicle repossession records.'],
    ['reports','▤','Reports','Day Book, collections, expenses, NOC and loan ledger reports.'],
    ['collection-risk','⚠','Collection & Risk','Ageing, penal/bounce and collection-risk controls.'],
    ['accounts','♟','Manage Accounts','Manage dealers, admin and operational users.'],
    ['masters','☰','Masters','OEM, HP, battery and vehicle master data.'],
  ];
  return <div className="admin-page">
    <div className="admin-page-head">
      <div><div className="admin-eyebrow">CONTROL CENTER</div><h1>CHFPL Operations Dashboard</h1><p>One place for loan workflow, collections, receivables and daily operations.</p></div>
      <button className="admin-btn" onClick={load}>↻ Refresh</button>
    </div>
    {error&&<div className="admin-alert error">⚠ {error}</div>}
    <div className="dealer-kpis">
      <div className="dealer-kpi"><span>Total Applications</span><strong>{data?.total_applications??'—'}</strong><small>All loan applications</small></div>
      <div className="dealer-kpi"><span>Approved</span><strong>{data?.approved_total??'—'}</strong><small>Currently approved</small></div>
      <div className="dealer-kpi"><span>Disbursed</span><strong>{data?.disbursed_total??'—'}</strong><small>Active loan accounts</small></div>
      <div className="dealer-kpi"><span>Overdue Receivable</span><strong>{receivable?('₹'+Number(receivable.totals.overdue||0).toLocaleString('en-IN')):'—'}</strong><small>Past-due EMI balance</small></div>
    </div>
    <section className="admin-card" style={{marginTop:24}}>
      <div className="admin-card-title"><div><h2>Operations</h2><span>Open the module you need without going through multiple screens.</span></div></div>
      <div className="admin-home-grid" style={{marginTop:16}}>
        {cards.map(([to,icon,title,desc])=><Link key={to} to={to} className="admin-home-card"><span>{icon}</span><div><h3>{title}</h3><p>{desc}</p></div><b>→</b></Link>)}
        <Link to="/app/accounting" className="admin-home-card"><span>▦</span><div><h3>Accounting & Finance</h3><p>Open the finance workspace and accounting reports.</p></div><b>→</b></Link>
      </div>
    </section>
    <section className="admin-card" style={{marginTop:24}}>
      <div className="admin-card-title"><div><h2>Receivable Snapshot</h2><span>Based on the EMI schedule and recorded receipts.</span></div><Link className="admin-btn secondary" to="payment-receivable">Open Register</Link></div>
      <div className="dealer-kpis" style={{marginTop:16}}>
        <div className="dealer-kpi"><span>Outstanding</span><strong>{receivable?('₹'+Number(receivable.totals.outstanding||0).toLocaleString('en-IN')):'—'}</strong><small>Total unpaid EMI balance</small></div>
        <div className="dealer-kpi"><span>Overdue</span><strong>{receivable?('₹'+Number(receivable.totals.overdue||0).toLocaleString('en-IN')):'—'}</strong><small>Past due date</small></div>
        <div className="dealer-kpi"><span>Due Today</span><strong>{receivable?('₹'+Number(receivable.totals.due_today||0).toLocaleString('en-IN')):'—'}</strong><small>Today\'s scheduled amount</small></div>
        <div className="dealer-kpi"><span>Receipts Recorded</span><strong>{receivable?('₹'+Number(receivable.totals.received||0).toLocaleString('en-IN')):'—'}</strong><small>Receipt entries</small></div>
      </div>
    </section>
  </div>;
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
