import ProfileMenu from '../../components/ProfileMenu';
import RoleNavigation from '../../components/RoleNavigation';
import CollectionActivity from '../../components/CollectionActivity';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { decideApplication, listPendingDecisions } from './api';
import { clearAppUserToken } from '../../utils/appUserAuth';
import { clearCurrentUser, getCurrentUser } from '../../utils/session';

export default function DODashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [remarks, setRemarks] = useState({});
  const [decidingId, setDecidingId] = useState(null);

  function logout() {
    clearAppUserToken();
    clearCurrentUser();
    navigate('/login', { replace: true });
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await listPendingDecisions();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const pending = applications.filter((a) => a.application_status === 'fi_done');
  const decided = applications.filter((a) => a.application_status !== 'fi_done');

  async function decide(app, decision) {
    setDecidingId(app.id);
    setError(''); setMessage('');
    try {
      const data = await decideApplication({
        loan_application_id: app.id,
        decision,
        remarks: remarks[app.id] || '',
      });
      setMessage(data.message || `Application ${decision}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div className="app-shell"><RoleNavigation role="do" />
      <header className="app-header">
        <span>Disbursement Officer{user?.name ? ` — ${user.name}` : ''}</span>
        <ProfileMenu compact />
        <button type="button" className="app-header-logout" onClick={logout}>↪ Logout</button>
      </header>
      <main className="app-body">
        {message && <div className="admin-alert success">✓ {message}</div>}
        {error && <div className="admin-alert error">⚠ {error}</div>}

        <section className="admin-card staff-list-card">
          <div className="admin-card-title">
            <div><h2>Awaiting Decision</h2><span>FI completed — approve or reject</span></div>
            <button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Application</th><th>Customer</th><th>Loan / Vehicle</th><th>FI Report</th><th>Remarks & Decision</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="empty-cell">Loading…</td></tr>
                ) : pending.length === 0 ? (
                  <tr><td colSpan="5" className="empty-cell">Nothing pending decision.</td></tr>
                ) : pending.map((app) => (
                  <tr key={app.id}>
                    <td><strong>{app.application_no}</strong><div className="muted">{app.dealer_name}</div></td>
                    <td className="contact-text"><div>{app.customer_name}</div><div className="muted">{app.customer_phone}</div><div className="muted">{app.customer_address}</div></td>
                    <td>₹{app.loan_amount_requested} / {app.tenure_months}mo<div className="muted">{app.vehicle_model}</div></td>
                    <td className="contact-text">
                      {app.fi ? (
                        <>
                          <div><span className={`role-pill ${app.fi.recommendation === 'positive' ? 'field_executive' : 'staff'}`}>{app.fi.recommendation}</span></div>
                          <div className="muted">{app.fi.residence_type} · visited {app.fi.visit_date}</div>
                          <div className="muted">{app.fi.remarks}</div>
                          {app.fi.latitude && app.fi.longitude && (
                            <div className="muted">📍 {app.fi.latitude}, {app.fi.longitude}</div>
                          )}
                        </>
                      ) : <span className="muted">No FI data</span>}
                    </td>
                    <td className="actions-cell">
                      <input
                        placeholder="Remarks (optional)"
                        value={remarks[app.id] || ''}
                        onChange={(e) => setRemarks((r) => ({ ...r, [app.id]: e.target.value }))}
                        style={{ marginBottom: 8, width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="admin-btn small" disabled={decidingId === app.id} onClick={() => decide(app, 'approved')}>Approve</button>
                        <button className="admin-btn small danger" disabled={decidingId === app.id} onClick={() => decide(app, 'rejected')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card staff-list-card">
          <div className="admin-card-title"><div><h2>Decided</h2><span>Approved or rejected</span></div></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Application</th><th>Customer</th><th>Status</th></tr></thead>
              <tbody>
                {decided.length === 0 ? (
                  <tr><td colSpan="3" className="empty-cell">No decisions yet.</td></tr>
                ) : decided.map((app) => (
                  <tr key={app.id}>
                    <td><strong>{app.application_no}</strong></td>
                    <td className="contact-text"><div>{app.customer_name}</div><div className="muted">{app.customer_phone}</div></td>
                    <td><span className={`role-pill ${app.application_status === 'approved' ? 'field_executive' : 'staff'}`}>{app.application_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      <CollectionActivity compact />
    </main>
    </div>
  );
}
