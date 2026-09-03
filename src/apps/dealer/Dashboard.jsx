import ProfileMenu from '../../components/ProfileMenu';
import RoleNavigation from '../../components/RoleNavigation';
import CollectionActivity from '../../components/CollectionActivity';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearDealerToken, fetchLoanApplications, fetchDealerProfile } from './api';
import { clearCurrentUser, getCurrentUser, setCurrentUser } from '../../utils/session';

const STATUS_META = {
  submitted: { label: 'Submitted' },
  fi_pending: { label: 'FI Pending' },
  fi_done: { label: 'FI Done' },
  approved: { label: 'Approved' },
  sanctioned: { label: 'Sanctioned' },
  disbursed: { label: 'Disbursed' },
  rejected: { label: 'Rejected' },
  cancelled: { label: 'Cancelled' },
};

function money(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusLabel(status) {
  return STATUS_META[status]?.label || String(status || 'Unknown').replaceAll('_', ' ');
}

export default function DealerDashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(getCurrentUser() || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function logout() {
    clearDealerToken();
    clearCurrentUser();
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    let alive = true;
    Promise.all([fetchLoanApplications(), fetchDealerProfile()])
      .then(([apps, dealerProfile]) => {
        if (!alive) return;
        setApplications(apps || []);
        setProfile(dealerProfile || {});
        setCurrentUser({ ...(getCurrentUser() || {}), ...(dealerProfile || {}), role: 'dealer' });
      })
      .catch((e) => alive && setError(e.message || 'Could not load dashboard'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const total = applications.length;
    const approved = applications.filter(a => ['approved', 'sanctioned'].includes(a.application_status)).length;
    const disbursed = applications.filter(a => a.application_status === 'disbursed').length;
    const pending = applications.filter(a => ['submitted', 'fi_pending', 'fi_done'].includes(a.application_status)).length;
    const requested = applications.reduce((sum, a) => sum + Number(a.loan_amount_requested || 0), 0);
    return { total, approved, disbursed, pending, requested };
  }, [applications]);

  const statusRows = useMemo(() => {
    const counts = applications.reduce((acc, a) => {
      const key = a.application_status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [applications]);

  return (
    <div className="dealer-shell"><RoleNavigation role="dealer" />
      <header className="dealer-header">
        <div>
          <div className="dealer-brand">Capital Hind Finance</div>
          <div className="dealer-header-sub">Dealer Portal</div>
        </div>
        <div className="dealer-header-actions">
          <ProfileMenu compact onUpdated={(next) => setProfile(next || {})} />
          <button type="button" className="app-header-logout" onClick={logout}>↪ Logout</button>
        </div>
      </header>

      <main className="dealer-main">
        <div className="dealer-page-head">
          <div>
            <div className="dealer-eyebrow">DEALER DASHBOARD</div>
            <h1>Good to see you, {profile.full_name || 'Dealer'}</h1>
            <p>Track your loan applications, approvals and disbursements in one place.</p>
          </div>
          <Link to="/app/dealer/new-application" className="dealer-primary">+ New loan application</Link>
        </div>

        {error && <div className="dealer-error">{error}</div>}

        <section className="dealer-kpis">
          <div className="dealer-kpi"><span>Total Applications</span><strong>{loading ? '—' : stats.total}</strong><small>Last 50 applications</small></div>
          <div className="dealer-kpi"><span>Pending</span><strong>{loading ? '—' : stats.pending}</strong><small>Needs processing</small></div>
          <div className="dealer-kpi"><span>Approved / Sanctioned</span><strong>{loading ? '—' : stats.approved}</strong><small>Positive decisions</small></div>
          <div className="dealer-kpi"><span>Disbursed</span><strong>{loading ? '—' : stats.disbursed}</strong><small>Successfully disbursed</small></div>
          <div className="dealer-kpi dealer-kpi-wide"><span>Loan Amount Requested</span><strong>{loading ? '—' : money(stats.requested)}</strong><small>Total across displayed applications</small></div>
        </section>

        <section className="dealer-grid">
          <div className="dealer-card">
            <div className="dealer-card-head"><div><h2>Loan application status</h2><p>Current status of your submitted applications.</p></div><span>{applications.length} records</span></div>
            <div className="status-chart">
              {statusRows.length === 0 && !loading && <div className="dealer-empty">No loan applications yet.</div>}
              {statusRows.map(([status, count]) => {
                const pct = Math.max(8, Math.round((count / Math.max(applications.length, 1)) * 100));
                return <div className="status-row" key={status}><div className="status-row-top"><span>{statusLabel(status)}</span><strong>{count}</strong></div><div className="status-track"><div className="status-fill" style={{ width: `${pct}%` }} /></div></div>;
              })}
            </div>
          </div>

          <div className="dealer-card">
            <div className="dealer-card-head"><div><h2>Quick actions</h2><p>Common dealer tasks.</p></div></div>
            <div className="dealer-actions">
              <Link to="/app/dealer/new-application" className="dealer-action"><b>＋</b><span><strong>New application</strong><small>Submit a fresh customer loan application</small></span></Link>
              <div className="dealer-action"><b>◉</b><span><strong>My profile</strong><small>Use the Profile button in the header to update all details</small></span></div>
            </div>
          </div>
        </section>

        <section className="dealer-card dealer-applications">
          <div className="dealer-card-head"><div><h2>Recent loan applications</h2><p>Latest applications submitted by your dealer account.</p></div></div>
          <div className="dealer-table-wrap">
            <table className="dealer-table"><thead><tr><th>Application</th><th>Customer</th><th>Vehicle</th><th>Loan Amount</th><th>Status</th><th>Submitted</th></tr></thead>
              <tbody>
                {applications.slice(0, 10).map(a => <tr key={a.id}><td><strong>{a.application_no || '—'}</strong>{a.loan_account_no && <small>{a.loan_account_no}</small>}</td><td>{a.customer_name || '—'}<small>{a.customer_phone || ''}</small></td><td>{a.vehicle_model || '—'}</td><td>{money(a.loan_amount_requested)}</td><td><span className={`dealer-status status-${String(a.application_status || 'unknown').replaceAll('_', '-')}`}>{statusLabel(a.application_status)}</span></td><td>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-IN') : '—'}</td></tr>)}
                {!loading && applications.length === 0 && <tr><td colSpan="6" className="dealer-empty">No applications found.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      <CollectionActivity compact />
    </main>

    </div>
  );
}
