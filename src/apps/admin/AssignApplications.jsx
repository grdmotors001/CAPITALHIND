import { useEffect, useMemo, useState } from 'react';
import { assignFieldExecutive, listLoanApplicationsAdmin, listUsers } from './api';

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  fi_pending: 'FI Pending',
  fi_done: 'FI Done',
  approved: 'Approved',
  rejected: 'Rejected',
  sanctioned: 'Sanctioned',
  disbursed: 'Disbursed',
};

export default function AssignApplications() {
  const [applications, setApplications] = useState([]);
  const [fieldExecutives, setFieldExecutives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [selectedFe, setSelectedFe] = useState({});
  const [cibil, setCibil] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [appsData, usersData] = await Promise.all([listLoanApplicationsAdmin(), listUsers()]);
      setApplications(appsData.applications || []);
      setFieldExecutives((usersData.users || []).filter((u) => u.role === 'field_executive' && u.is_active));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const assignable = useMemo(
    () => applications.filter((a) => ['submitted', 'fi_pending'].includes(a.application_status)),
    [applications]
  );
  const inReview = useMemo(
    () => applications.filter((a) => !['submitted', 'fi_pending'].includes(a.application_status)),
    [applications]
  );

  async function handleAssign(appId) {
    const feId = selectedFe[appId];
    if (!feId) {
      setError('Pehle Field Executive select karein.');
      return;
    }
    setAssigningId(appId);
    setError(''); setMessage('');
    try {
      const data = await assignFieldExecutive({ loan_application_id: appId, fe_user_id: feId, cibil_score: cibil[appId] });
      setMessage(data.message || 'Assigned.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="admin-eyebrow">LOAN WORKFLOW</div>
          <h1>Assign Loan Applications</h1>
          <p>Naye loan applications ko Field Executive ko FI ke liye assign karein.</p>
        </div>
        <div className="admin-count">{applications.length} application{applications.length === 1 ? '' : 's'}</div>
      </div>

      {message && <div className="admin-alert success">✓ {message}</div>}
      {error && <div className="admin-alert error">⚠ {error}</div>}

      <section className="admin-card staff-list-card">
        <div className="admin-card-title">
          <div><h2>Pending Assignment</h2><span>Submitted / re-assignable applications</span></div>
          <button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Application</th><th>Customer</th><th>Vehicle</th><th>Dealer</th><th>Status</th><th>CIBIL Score</th><th>Assign to FE</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty-cell">Loading…</td></tr>
              ) : assignable.length === 0 ? (
                <tr><td colSpan="7" className="empty-cell">No applications pending assignment.</td></tr>
              ) : assignable.map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.application_no}</strong></td>
                  <td className="contact-text"><div>{app.customer_name || '—'}</div><div className="muted">{app.customer_phone}</div></td>
                  <td>{app.vehicle_model || '—'}</td>
                  <td>{app.dealer_name || '—'}</td>
                  <td><span className={`role-pill ${app.application_status === 'fi_pending' ? 'field_executive' : 'staff'}`}>{STATUS_LABELS[app.application_status] || app.application_status}</span></td>
                  <td><input type="number" min="300" max="900" placeholder="300-900" value={cibil[app.id] ?? app.cibil_score ?? ''} onChange={e => setCibil(s => ({ ...s, [app.id]: e.target.value }))} style={{ width: 110 }} /></td>
                  <td className="actions-cell">
                    <select
                      value={selectedFe[app.id] || app.assigned_fe_id || ''}
                      onChange={(e) => setSelectedFe((s) => ({ ...s, [app.id]: e.target.value }))}
                      style={{ marginRight: 8, maxWidth: 170, display: 'inline-block' }}
                    >
                      <option value="">Select FE…</option>
                      {fieldExecutives.map((fe) => (
                        <option key={fe.id} value={fe.id}>{fe.full_name}</option>
                      ))}
                    </select>
                    <button
                      className="admin-btn small"
                      disabled={assigningId === app.id}
                      onClick={() => handleAssign(app.id)}
                    >
                      {assigningId === app.id ? 'Assigning…' : app.assigned_fe_id ? 'Re-assign' : 'Assign'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card staff-list-card">
        <div className="admin-card-title">
          <div><h2>In Review / Decided</h2><span>FI done, approved or rejected</span></div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Application</th><th>Customer</th><th>Assigned FE</th><th>FI Result</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="empty-cell">Loading…</td></tr>
              ) : inReview.length === 0 ? (
                <tr><td colSpan="5" className="empty-cell">No applications yet.</td></tr>
              ) : inReview.map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.application_no}</strong></td>
                  <td className="contact-text"><div>{app.customer_name || '—'}</div><div className="muted">{app.customer_phone}</div></td>
                  <td>{app.assigned_fe_name || <span className="muted">—</span>}</td>
                  <td>{app.fi_recommendation ? <span className={`role-pill ${app.fi_recommendation === 'positive' ? 'field_executive' : 'staff'}`}>{app.fi_recommendation}</span> : <span className="muted">—</span>}</td>
                  <td><span className="role-pill admin">{STATUS_LABELS[app.application_status] || app.application_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
