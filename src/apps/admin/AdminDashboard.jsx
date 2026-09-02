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

// Smooth a series of {x,y} points into an SVG cubic-bezier path (Catmull-Rom).
function smoothPath(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  let d = `M ${pts[0].x},${pts[0].y} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)} `;
  }
  return d.trim();
}

const CHART_W = 400, CHART_H = 170;

function AdminCharts({ months }) {
  const list = months || [];
  const n = Math.max(1, list.length);
  const max = Math.max(1, ...list.map(m => Math.max(m.applied || 0, m.approved || 0, m.disbursement || 0)));
  const last = list[list.length - 1] || {};
  const applied = Number(last.applied || 0), approved = Number(last.approved || 0), disbursed = Number(last.disbursement || 0);

  // shared horizontal rhythm so bar groups and trend points line up the same way
  const padTop = 18, padBottom = 34, baseline = CHART_H - padBottom, chartH = baseline - padTop;
  const slot = CHART_W / n;
  const shortMonth = m => (m.month || '').split(' ')[0];

  const barW = Math.min(15, Math.max(5, slot * 0.24));
  const barGap = barW * 0.5;
  const gridY = [baseline, baseline - chartH / 2, baseline - chartH];

  const trendPts = list.map((m, i) => ({ x: slot * (i + 0.5), y: baseline - (Number(m.disbursement || 0) / max) * chartH, v: Number(m.disbursement || 0), label: shortMonth(m) }));
  const linePath = smoothPath(trendPts);
  const areaPath = trendPts.length ? `${linePath} L ${trendPts[trendPts.length - 1].x},${baseline} L ${trendPts[0].x},${baseline} Z` : '';

  const r = 54, cx = 66, cy = 66, circumference = 2 * Math.PI * r;
  const donutTotal = Math.max(1, applied + approved + disbursed);
  const approvedPct = (approved / donutTotal) * 100;
  const disbursedPct = (disbursed / donutTotal) * 100;
  const otherPct = Math.max(0, 100 - approvedPct - disbursedPct);
  const dashApproved = (approvedPct / 100) * circumference;
  const dashDisbursed = (disbursedPct / 100) * circumference;
  const dashOther = Math.max(0, circumference - dashApproved - dashDisbursed);

  return <div className="admin-chart-grid">
    <section className="admin-chart-card">
      <div className="admin-chart-head"><div><h3>Monthly Applications</h3><span>Applied vs approved</span></div><b>{applied}</b></div>
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-label="Monthly applications, applied versus approved">
          {gridY.map((y, i) => <line key={i} x1="0" x2={CHART_W} y1={y} y2={y} className="chart-grid-line" />)}
          {list.map((m, i) => {
            const cxg = slot * (i + 0.5);
            const aH = (Number(m.applied || 0) / max) * chartH, pH = (Number(m.approved || 0) / max) * chartH;
            return <g key={m.month}>
              <rect x={cxg - barGap / 2 - barW} y={baseline - Math.max(2, aH)} width={barW} height={Math.max(2, aH)} rx="3" className="chart-bar-applied"><title>{`${m.month}: ${m.applied || 0} applied`}</title></rect>
              <rect x={cxg + barGap / 2} y={baseline - Math.max(2, pH)} width={barW} height={Math.max(2, pH)} rx="3" className="chart-bar-approved"><title>{`${m.month}: ${m.approved || 0} approved`}</title></rect>
              <text x={cxg} y={CHART_H - 12} textAnchor="middle" className="chart-axis-label">{shortMonth(m)}</text>
            </g>;
          })}
        </svg>
      </div>
      <div className="chart-legend"><span><i className="legend-a" />Applied</span><span><i className="legend-b" />Approved</span></div>
    </section>

    <section className="admin-chart-card">
      <div className="admin-chart-head"><div><h3>Disbursement Trend</h3><span>Month-wise disbursed cases</span></div><b>{disbursed}</b></div>
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-label="Disbursement trend">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--maroon)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="var(--maroon)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridY.map((y, i) => <line key={i} x1="0" x2={CHART_W} y1={y} y2={y} className="chart-grid-line" />)}
          {trendPts.length > 1 && <path d={areaPath} fill="url(#trendFill)" stroke="none" />}
          <path d={linePath} fill="none" className="chart-trend-line" />
          {trendPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === trendPts.length - 1 ? 4.5 : 3} className={i === trendPts.length - 1 ? 'chart-dot chart-dot-last' : 'chart-dot'}>
              <title>{`${months[i].month}: ${p.v} disbursed`}</title>
            </circle>
          ))}
          {trendPts.map((p, i) => <text key={i} x={p.x} y={CHART_H - 12} textAnchor="middle" className="chart-axis-label">{p.label}</text>)}
        </svg>
      </div>
    </section>

    <section className="admin-chart-card">
      <div className="admin-chart-head"><div><h3>Loan Status Mix</h3><span>Latest month composition</span></div><b>{donutTotal}</b></div>
      <div className="chart-donut-wrap">
        <svg viewBox="0 0 132 132" width="132" height="132" aria-label="Loan status composition">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0e6e8" strokeWidth="16" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--maroon)" strokeWidth="16" strokeDasharray={`${dashApproved} ${circumference - dashApproved}`} strokeDashoffset="0" transform={`rotate(-90 ${cx} ${cy})`}><title>{`Approved: ${approved} (${approvedPct.toFixed(0)}%)`}</title></circle>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--orange)" strokeWidth="16" strokeDasharray={`${dashDisbursed} ${circumference - dashDisbursed}`} strokeDashoffset={-dashApproved} transform={`rotate(-90 ${cx} ${cy})`}><title>{`Disbursed: ${disbursed} (${disbursedPct.toFixed(0)}%)`}</title></circle>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e9e2df" strokeWidth="16" strokeDasharray={`${dashOther} ${circumference - dashOther}`} strokeDashoffset={-(dashApproved + dashDisbursed)} transform={`rotate(-90 ${cx} ${cy})`}><title>{`Applied / other: ${Math.max(0, donutTotal - approved - disbursed)} (${otherPct.toFixed(0)}%)`}</title></circle>
          <text x={cx} y={cy - 3} textAnchor="middle" className="chart-donut-total">{approved + disbursed}</text>
          <text x={cx} y={cy + 13} textAnchor="middle" className="chart-donut-caption">approved + disbursed</text>
        </svg>
        <div className="donut-list">
          <span><i className="dot-a" />Approved <b>{approved}</b><small>{approvedPct.toFixed(0)}%</small></span>
          <span><i className="dot-b" />Disbursed <b>{disbursed}</b><small>{disbursedPct.toFixed(0)}%</small></span>
          <span><i className="dot-c" />Applied / other <b>{Math.max(0, donutTotal - approved - disbursed)}</b><small>{otherPct.toFixed(0)}%</small></span>
        </div>
      </div>
    </section>
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
