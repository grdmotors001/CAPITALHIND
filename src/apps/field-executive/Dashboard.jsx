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
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [selectedCollectionLoan, setSelectedCollectionLoan] = useState(null);
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

  function openCollection() {
    setCollectionOpen(true);
    setCollectionSearch('');
    setSelectedCollectionLoan(null);
    setCollectionAmount('');
    setCollectionRemarks('');
    setError(''); setMessage('');
  }

  function selectCollectionLoan(app) {
    setSelectedCollectionLoan(app);
    setCollectionAmount(app.emi_amount ? String(app.emi_amount) : '');
    setCollectionRemarks('');
    setError('');
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
      setMessage(data.message || 'EMI cash collection recorded.');
      setCollectionAmount(''); setCollectionRemarks('');
      setSelectedCollectionLoan(null);
      setCollectionSearch('');
      setCollectionOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCollectingId(null);
    }
  }

  const collectableStatuses = new Set(['approved', 'sanctioned', 'disbursed']);
  const collectionCandidates = applications.filter((app) => collectableStatuses.has(app.application_status));
  const searchTerm = collectionSearch.trim().toLowerCase();
  const collectionMatches = collectionCandidates.filter((app) => {
    if (!searchTerm) return true;
    return [app.customer_name, app.customer_phone, app.vehicle_no, app.application_no, app.loan_account_no]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchTerm));
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <span>Field Executive App{user?.name ? ` — ${user.name}` : ''}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="admin-btn small" onClick={openCollection}>💰 Collect EMI's</button>
          <button type="button" className="app-header-logout" onClick={logout}>↪ Logout</button>
        </div>
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
                      {collectableStatuses.has(app.application_status) ? <span className="muted">Eligible — use Collect EMI's above</span> : <span className="muted">Not available</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {collectionOpen && (
          <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="admin-card" style={{ width: 'min(680px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="admin-card-title">
                <div><h2>Collect EMI's</h2><span>Search assigned loans by vehicle no., mobile no. or customer name</span></div>
                <button type="button" className="admin-btn secondary" onClick={() => setCollectionOpen(false)}>✕ Close</button>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <input
                  autoFocus
                  value={collectionSearch}
                  onChange={(e) => { setCollectionSearch(e.target.value); setSelectedCollectionLoan(null); }}
                  placeholder="Search Vehicle No. / Mobile No. / Customer Name"
                />

                <div style={{ border: '1px solid #eee', borderRadius: 10, maxHeight: 260, overflowY: 'auto' }}>
                  {collectionMatches.length === 0 ? (
                    <div className="empty-cell">No approved/sanctioned/disbursed assigned loan found.</div>
                  ) : collectionMatches.map((app) => (
                    <button
                      type="button"
                      key={app.id}
                      onClick={() => selectCollectionLoan(app)}
                      style={{ width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid #eee', background: selectedCollectionLoan?.id === app.id ? '#fff4ec' : '#fff', padding: '12px 14px', cursor: 'pointer' }}
                    >
                      <strong>{app.customer_name || 'Customer'}</strong>
                      <div style={{ fontSize: 13, marginTop: 3 }}>
                        {app.customer_phone || 'No mobile'} · {app.vehicle_no || 'No vehicle no.'}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                        {app.application_no || app.loan_account_no || 'Loan'} · {app.application_status} · EMI ₹{Number(app.emi_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedCollectionLoan && (
                  <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><label>Name</label><input value={selectedCollectionLoan.customer_name || ''} readOnly /></div>
                      <div><label>Mobile No.</label><input value={selectedCollectionLoan.customer_phone || ''} readOnly /></div>
                      <div><label>Vehicle No.</label><input value={selectedCollectionLoan.vehicle_no || ''} readOnly /></div>
                      <div><label>Loan Status</label><input value={selectedCollectionLoan.application_status || ''} readOnly /></div>
                      <div><label>EMI Amount</label><input type="number" min="0.01" step="0.01" value={collectionAmount} onChange={(e) => setCollectionAmount(e.target.value)} /></div>
                      <div><label>Remarks</label><input value={collectionRemarks} onChange={(e) => setCollectionRemarks(e.target.value)} placeholder="Optional" /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <button type="button" className="admin-btn" disabled={collectingId === selectedCollectionLoan.id} onClick={() => handleCollectCash(selectedCollectionLoan)}>
                        {collectingId === selectedCollectionLoan.id ? 'Saving…' : '✓ Collect EMI'}
                      </button>
                      <button type="button" className="admin-btn secondary" onClick={() => { setSelectedCollectionLoan(null); setCollectionAmount(''); setCollectionRemarks(''); }}>Clear</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
