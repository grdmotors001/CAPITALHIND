import { useEffect, useState } from 'react';
import {
  listNpaAgeing, listRestructureRequests, createRestructureRequest,
  decideRestructureRequest, getRiskConfig, updateRiskConfig,
} from './api';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BUCKET_ORDER = ['STANDARD', 'SMA', 'SUB_STANDARD', 'DOUBTFUL', 'LOSS'];
const BUCKET_CLASS = {
  STANDARD: 'status-approved',
  SMA: 'status-submitted',
  SUB_STANDARD: 'status-rejected',
  DOUBTFUL: 'status-rejected',
  LOSS: 'status-rejected',
};

const REQUEST_TYPES = [
  { value: 'PART_PAYMENT', label: 'Part Payment' },
  { value: 'RESTRUCTURE', label: 'Restructure' },
  { value: 'FORECLOSURE', label: 'Foreclosure' },
];

export default function CollectionRisk() {
  const [tab, setTab] = useState('npa');

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="admin-eyebrow">RISK & COLLECTIONS</div>
          <h1>Collection & Risk</h1>
          <p>NPA ageing (IRAC buckets), penal/bounce configuration aur restructure / foreclosure requests.</p>
        </div>
      </div>

      <div className="account-tabs">
        <button className={tab === 'npa' ? 'active' : ''} onClick={() => setTab('npa')}>NPA Ageing</button>
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Restructure Requests</button>
        <button className={tab === 'config' ? 'active' : ''} onClick={() => setTab('config')}>Risk Config</button>
      </div>

      {tab === 'npa' && <NpaAgeing />}
      {tab === 'requests' && <RestructureRequests />}
      {tab === 'config' && <RiskConfig />}
    </div>
  );
}

function NpaAgeing() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [labels, setLabels] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const data = await listNpaAgeing();
      setRows(data.rows || []); setSummary(data.summary || {}); setLabels(data.labels || {});
    } catch (e) { setError(e.message || 'Could not load NPA ageing.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <>
      {error && <div className="admin-alert error">⚠ {error}</div>}
      <div className="report-summary-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        {BUCKET_ORDER.map((b) => (
          <div key={b}>
            <span>{labels[b] || b}</span>
            <strong>{summary[b]?.count ?? 0}</strong>
            <div className="muted" style={{ marginTop: 4 }}>{money(summary[b]?.amount)}</div>
          </div>
        ))}
      </div>

      <section className="admin-card report-table-card">
        <div className="admin-card-title">
          <div><h2>Loan-wise Ageing</h2><span>Overdue EMIs, days past due aur NPA bucket</span></div>
          <button className="admin-btn secondary" onClick={load}>↻ Refresh</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table report-table">
            <thead><tr><th>Loan A/C</th><th>Customer</th><th>Overdue EMIs</th><th>Overdue Amount</th><th>Days Past Due</th><th>Bucket</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6" className="empty-cell">Loading…</td></tr> : rows.map((r) => (
                <tr key={r.loan_id}>
                  <td><strong>{r.loan_account_no || r.application_no}</strong></td>
                  <td>{r.customer_name}<div className="muted">{r.customer_phone}</div></td>
                  <td>{r.overdue_emi_count}</td>
                  <td className="num">{money(r.overdue_amount)}</td>
                  <td className="num">{r.days_past_due}</td>
                  <td><span className={`dealer-status ${BUCKET_CLASS[r.npa_bucket] || ''}`}>{r.npa_bucket_label}</span></td>
                </tr>
              ))}
              {!loading && !rows.length && <tr><td colSpan="6" className="empty-cell">No overdue loans — collections are current.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function RestructureRequests() {
  const [status, setStatus] = useState('All');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ loan_id: '', request_type: 'PART_PAYMENT', requested_amount: '', new_tenure_months: '', new_emi_amount: '', reason: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try { setItems((await listRestructureRequests(status)).items || []); }
    catch (e) { setError(e.message || 'Could not load requests.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [status]);

  async function submitRequest(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await createRestructureRequest({
        loan_id: Number(form.loan_id),
        request_type: form.request_type,
        requested_amount: form.requested_amount || null,
        new_tenure_months: form.new_tenure_months || null,
        new_emi_amount: form.new_emi_amount || null,
        reason: form.reason,
      });
      setCreating(false);
      setForm({ loan_id: '', request_type: 'PART_PAYMENT', requested_amount: '', new_tenure_months: '', new_emi_amount: '', reason: '' });
      load();
    } catch (e) { setError(e.message || 'Could not submit request.'); }
    finally { setSaving(false); }
  }

  async function decide(id, decision) {
    if (!window.confirm(`${decision === 'APPROVED' ? 'Approve' : 'Reject'} this request?`)) return;
    try { await decideRestructureRequest(id, decision); load(); }
    catch (e) { setError(e.message || 'Could not update request.'); }
  }

  return (
    <>
      {error && <div className="admin-alert error">⚠ {error}</div>}
      <section className="report-search-card">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option>
        </select>
        <button className="admin-btn" onClick={() => setCreating(true)}>+ New Request</button>
      </section>

      <section className="admin-card report-table-card">
        <div className="admin-card-title"><div><h2>Requests</h2><span>{items.length} total</span></div><button className="admin-btn secondary" onClick={load}>↻ Refresh</button></div>
        <div className="admin-table-wrap">
          <table className="admin-table report-table">
            <thead><tr><th>Loan A/C</th><th>Customer</th><th>Type</th><th>Requested Amount</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="empty-cell">Loading…</td></tr> : items.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.loan_applications?.loan_account_no || r.loan_applications?.application_no}</strong></td>
                  <td>{r.loan_applications?.customer_profiles?.full_name}</td>
                  <td>{REQUEST_TYPES.find(t => t.value === r.request_type)?.label || r.request_type}</td>
                  <td className="num">{r.requested_amount ? money(r.requested_amount) : '—'}</td>
                  <td>{r.reason || '—'}</td>
                  <td><span className={`dealer-status ${r.status === 'APPROVED' ? 'status-approved' : r.status === 'REJECTED' ? 'status-rejected' : 'status-submitted'}`}>{r.status}</span></td>
                  <td>{r.status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="admin-btn small" onClick={() => decide(r.id, 'APPROVED')}>Approve</button>
                      <button className="admin-btn small secondary" onClick={() => decide(r.id, 'REJECTED')}>Reject</button>
                    </div>
                  ) : '—'}</td>
                </tr>
              ))}
              {!loading && !items.length && <tr><td colSpan="7" className="empty-cell">No requests found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {creating && (
        <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setCreating(false)}>
          <form className="admin-modal" onSubmit={submitRequest}>
            <div className="admin-modal-head"><h2>New Restructure / Foreclosure Request</h2><span>Loan ID se request raise karein, admin approve karega</span></div>
            <div className="form-grid">
              <label>Loan ID (loan_applications.id)<input required value={form.loan_id} onChange={(e) => setForm({ ...form, loan_id: e.target.value })} placeholder="e.g. 142" /></label>
              <label>Request Type<select value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })}>{REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
              <label>Requested Amount<input type="number" value={form.requested_amount} onChange={(e) => setForm({ ...form, requested_amount: e.target.value })} /></label>
              <label>New Tenure (months)<input type="number" value={form.new_tenure_months} onChange={(e) => setForm({ ...form, new_tenure_months: e.target.value })} /></label>
              <label>New EMI Amount<input type="number" value={form.new_emi_amount} onChange={(e) => setForm({ ...form, new_emi_amount: e.target.value })} /></label>
              <label className="full">Reason<textarea rows="3" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit" className="admin-btn" disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function RiskConfig() {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => { getRiskConfig().then((d) => setCfg(d.config)).catch((e) => setError(e.message)); }, []);

  async function save(e) {
    e.preventDefault(); setSaving(true); setError(''); setSaved('');
    try {
      const d = await updateRiskConfig(cfg);
      setCfg(d.config); setSaved('Risk configuration updated.');
    } catch (e) { setError(e.message || 'Could not save.'); }
    finally { setSaving(false); }
  }

  if (!cfg) return <div className="admin-card" style={{ padding: 20 }}>{error ? <div className="admin-alert error">⚠ {error}</div> : 'Loading…'}</div>;

  const field = (key, label, step = '1') => (
    <label>{label}<input type="number" step={step} value={cfg[key] ?? ''} onChange={(e) => setCfg({ ...cfg, [key]: e.target.value })} /></label>
  );

  return (
    <section className="admin-card" style={{ padding: 22 }}>
      <div className="admin-card-title"><div><h2>Penal Interest, Bounce Charge & NPA Thresholds</h2><span>In values ke hisaab se collection reports aur NPA bucket calculate hote hain</span></div></div>
      {error && <div className="admin-alert error">⚠ {error}</div>}
      {saved && <div className="admin-alert success">✓ {saved}</div>}
      <form onSubmit={save} className="form-grid" style={{ marginTop: 16 }}>
        {field('penal_interest_rate_per_day', 'Penal Interest Rate / Day (%)', '0.01')}
        {field('bounce_charge_flat', 'Bounce Charge (flat ₹)')}
        {field('sma1_start_days', 'SMA-1 starts at (days overdue)')}
        {field('sma2_start_days', 'SMA-2 starts at (days overdue)')}
        {field('npa_start_days', 'NPA / Sub-Standard starts at (days)')}
        {field('doubtful_start_days', 'Doubtful starts at (days)')}
        {field('loss_start_days', 'Loss starts at (days)')}
        <div className="admin-modal-actions" style={{ gridColumn: '1/-1' }}>
          <button type="submit" className="admin-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Configuration'}</button>
        </div>
      </form>
    </section>
  );
}
