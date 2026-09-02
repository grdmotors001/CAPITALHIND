import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAssignedVisits, submitFieldInvestigation, collectCash } from './api';
import { clearAppUserToken } from '../../utils/appUserAuth';
import { clearCurrentUser, getCurrentUser } from '../../utils/session';

const emptyFiForm = {
  visit_date: new Date().toISOString().slice(0, 10),
  residence_type: 'own',
  mobile_no: '',
  monthly_income: '',
  latitude: '',
  longitude: '',
  remarks: '',
  recommendation: 'positive',
};

export default function FieldExecutiveDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeAppId, setActiveAppId] = useState(null);
  const [form, setForm] = useState(emptyFiForm);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [collectingId, setCollectingId] = useState(null);
  const [collectionAmount, setCollectionAmount] = useState('');
  const [collectionRemarks, setCollectionRemarks] = useState('');

  function logout() {
    clearAppUserToken();
    clearCurrentUser();
    navigate('/login', { replace: true });
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await listAssignedVisits();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const pending = applications.filter((a) => a.application_status === 'fi_pending');
  const completed = applications.filter((a) => a.application_status !== 'fi_pending');

  function startFi(app) {
    setActiveAppId(app.id);
    setForm(emptyFiForm);
    setMessage(''); setError('');
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Location is not supported on this device/browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateForm('latitude', pos.coords.latitude.toFixed(6));
        updateForm('longitude', pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError('Could not get GPS location. Please allow location access.');
        setLocating(false);
      }
    );
  }

  async function handleSubmitFi(e) {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const data = await submitFieldInvestigation({
        loan_application_id: activeAppId,
        ...form,
        monthly_income: form.monthly_income ? Number(form.monthly_income) : undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      });
      setMessage(data.message || 'Field Investigation report submitted.');
      setActiveAppId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCollectCash(app) {
    const amount = Number(collectionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid cash collection amount.');
      return;
    }
    setCollectingId(app.id); setError(''); setMessage('');
    try {
      const data = await collectCash({
        loan_application_id: app.id,
        amount,
        remarks: collectionRemarks,
      });
      setMessage(data.message || 'Cash collection recorded.');
      setCollectionAmount(''); setCollectionRemarks('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCollectingId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span>Field Executive App{user?.name ? ` — ${user.name}` : ''}</span>
        <button type="button" className="app-header-logout" onClick={logout}>↪ Logout</button>
      </header>
      <main className="app-body">
        {message && <div className="admin-alert success">✓ {message}</div>}
        {error && <div className="admin-alert error">⚠ {error}</div>}

        <section className="admin-card staff-list-card">
          <div className="admin-card-title">
            <div><h2>Today's Assigned Visits</h2><span>Pending Field Investigation</span></div>
            <button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Application</th><th>Customer</th><th>Address</th><th>Vehicle</th><th>Action</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="empty-cell">Loading…</td></tr>
                ) : pending.length === 0 ? (
                  <tr><td colSpan="5" className="empty-cell">No visits assigned right now.</td></tr>
                ) : pending.map((app) => (
                  <tr key={app.id}>
                    <td><strong>{app.application_no}</strong></td>
                    <td className="contact-text"><div>{app.customer_name}</div><div className="muted">{app.customer_phone}</div></td>
                    <td>{app.customer_address || '—'}{app.customer_city ? `, ${app.customer_city}` : ''}</td>
                    <td>{app.vehicle_model || '—'}</td>
                    <td className="actions-cell">
                      <button className="admin-btn small" onClick={() => startFi(app)}>
                        {activeAppId === app.id ? 'Editing…' : 'Start FI'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activeAppId && (
            <form className="staff-form" onSubmit={handleSubmitFi}>
              <div className="admin-card-title" style={{ padding: '0 0 14px' }}>
                <div><h2>Field Investigation Report</h2><span>Application #{pending.find((a) => a.id === activeAppId)?.application_no}</span></div>
              </div>
              <div className="form-grid">
                <div><label>Visit date</label><input type="date" value={form.visit_date} onChange={(e) => updateForm('visit_date', e.target.value)} required /></div>
                <div>
                  <label>Residence type</label>
                  <select value={form.residence_type} onChange={(e) => updateForm('residence_type', e.target.value)}>
                    <option value="own">Own house</option>
                    <option value="rented">Rented house</option>
                  </select>
                </div>
                <div><label>Mobile no.</label><input value={form.mobile_no} onChange={(e) => updateForm('mobile_no', e.target.value)} maxLength="15" placeholder="98xxxxxxxx" /></div>
                <div><label>Monthly income</label><input type="number" min="0" value={form.monthly_income} onChange={(e) => updateForm('monthly_income', e.target.value)} placeholder="₹" /></div>
                <div>
                  <label>GPS location</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={form.latitude} onChange={(e) => updateForm('latitude', e.target.value)} placeholder="Latitude" />
                    <input value={form.longitude} onChange={(e) => updateForm('longitude', e.target.value)} placeholder="Longitude" />
                  </div>
                  <button type="button" className="admin-btn small secondary" style={{ marginTop: 8 }} onClick={useMyLocation} disabled={locating}>
                    {locating ? 'Locating…' : '📍 Use my current location'}
                  </button>
                </div>
                <div>
                  <label>Recommendation</label>
                  <select value={form.recommendation} onChange={(e) => updateForm('recommendation', e.target.value)}>
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
                <div className="full"><label>Remarks</label><input value={form.remarks} onChange={(e) => updateForm('remarks', e.target.value)} placeholder="Neighbour confirmation, notes, etc." /></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="admin-btn" disabled={saving}>{saving ? 'Submitting…' : 'Submit FI Report'}</button>
                <button type="button" className="admin-btn secondary" onClick={() => setActiveAppId(null)}>Cancel</button>
              </div>
            </form>
          )}
        </section>

        <section className="admin-card staff-list-card">
          <div className="admin-card-title"><div><h2>Completed</h2><span>FI already submitted</span></div></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Application</th><th>Customer</th><th>Result</th><th>Status</th><th>Cash Collection</th></tr></thead>
              <tbody>
                {completed.length === 0 ? (
                  <tr><td colSpan="5" className="empty-cell">No completed visits yet.</td></tr>
                ) : completed.map((app) => (
                  <tr key={app.id}>
                    <td><strong>{app.application_no}</strong></td>
                    <td className="contact-text"><div>{app.customer_name}</div><div className="muted">{app.customer_phone}</div></td>
                    <td>{app.fi_recommendation ? <span className={`role-pill ${app.fi_recommendation === 'positive' ? 'field_executive' : 'staff'}`}>{app.fi_recommendation}</span> : '—'}</td>
                    <td>{app.application_status}</td>
                    <td className="actions-cell">
                      {app.application_status === 'disbursed' ? (
                        <div style={{ minWidth: 220 }}>
                          <input type="number" min="0.01" step="0.01" placeholder="Cash amount"
                            value={collectingId === app.id ? collectionAmount : ''}
                            onChange={e => { setCollectingId(app.id); setCollectionAmount(e.target.value); }} />
                          {collectingId === app.id && (
                            <>
                              <input style={{ marginTop: 6 }} placeholder="Remarks (optional)"
                                value={collectionRemarks} onChange={e => setCollectionRemarks(e.target.value)} />
                              <button type="button" className="admin-btn small" style={{ marginTop: 6 }}
                                onClick={() => handleCollectCash(app)}>
                                ✓ Collect Cash
                              </button>
                            </>
                          )}
                        </div>
                      ) : <span className="muted">Available after disbursement</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
