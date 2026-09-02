import CollectionActivity from '../../components/CollectionActivity';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCurrentUser, getCurrentUser } from '../../utils/session';
import { clearAppUserToken, apiGet, apiPost } from '../../utils/appUserAuth';

const OUTCOMES = [
  ['connected', 'Connected'], ['not_connected', 'Not connected'], ['callback', 'Callback required'],
  ['interested', 'Interested'], ['not_interested', 'Not interested'], ['wrong_number', 'Wrong number'],
  ['promise_to_pay', 'Promise to pay'], ['paid', 'Paid'], ['do_not_call', 'Do not call'],
];

function money(v) { return `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`; }
function statusLabel(v) { return String(v || 'unknown').replaceAll('_', ' '); }

export default function TeleCallerDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser() || {};
  const [data, setData] = useState({ registers: [], applications: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ outcome: 'connected', notes: '', callback_at: '' });
  const [saving, setSaving] = useState(false);

  function logout() {
    clearAppUserToken(); clearCurrentUser(); navigate('/login', { replace: true });
  }
  async function load() {
    setLoading(true); setError('');
    try { setData(await apiGet('/api/tele-caller', 'dashboard')); }
    catch (e) { setError(e.message || 'Could not load dashboard'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const queue = useMemo(() => data.applications || [], [data.applications]);
  const pendingCallbacks = queue.filter(a => a.last_call?.callback_at && new Date(a.last_call.callback_at) >= new Date());

  async function saveCall(e) {
    e.preventDefault(); if (!active) return;
    setSaving(true); setError('');
    try {
      await apiPost('/api/tele-caller', 'log-call', { loan_application_id: active.id, ...form, callback_at: form.callback_at || null });
      setActive(null); setForm({ outcome: 'connected', notes: '', callback_at: '' }); await load();
    } catch (e) { setError(e.message || 'Could not save call'); }
    finally { setSaving(false); }
  }

  return <div className="tele-shell">
    <header className="tele-header"><div><div className="tele-brand">Capital Hind Finance</div><div className="tele-sub">Tele Caller Portal</div></div><div className="tele-header-right"><span>{user.full_name || 'Tele Caller'}</span><button onClick={logout}>↪ Logout</button></div></header>
    <main className="tele-main">
      <div className="tele-page-head"><div><div className="tele-eyebrow">CALLING DASHBOARD</div><h1>Good to see you, {user.full_name || 'Tele Caller'}</h1><p>All loan cases par calling aur follow-up manage karein. Field Executive ka assigned data yahan include nahi hota.</p></div><button className="tele-refresh" onClick={load} disabled={loading}>↻ Refresh</button></div>
      {error && <div className="tele-error">⚠ {error}</div>}
      <section className="tele-kpis">
        <div><span>Assigned Registers</span><strong>{loading ? '—' : data.stats.registers || 0}</strong></div>
        <div><span>Calling Queue</span><strong>{loading ? '—' : data.stats.queue || 0}</strong></div>
        <div><span>Calls Today</span><strong>{loading ? '—' : data.stats.calls_today || 0}</strong></div>
        <div><span>Callbacks</span><strong>{loading ? '—' : data.stats.callbacks || 0}</strong></div>
      </section>
      <section className="tele-grid">
        <div className="tele-card"><div className="tele-card-head"><div><h2>My physical registers</h2><p>Team Leader se assigned ledgers (reference ke liye).</p></div></div><div className="tele-registers">{data.registers.length ? data.registers.map(r => <div className="tele-register" key={r.id}><strong>{r.register_serial_no}</strong><span>{r.assigned_at ? new Date(r.assigned_at).toLocaleDateString('en-IN') : '—'}</span></div>) : <div className="tele-empty">No register assigned yet.</div>}</div></div>
        <div className="tele-card"><div className="tele-card-head"><div><h2>Today at a glance</h2><p>Calling workload.</p></div></div><div className="tele-mini-list"><div><span>Loans in queue</span><b>{queue.length}</b></div><div><span>Callback follow-ups</span><b>{pendingCallbacks.length}</b></div><div><span>Last refresh</span><b>{loading ? '…' : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b></div></div></div>
      </section>
      <section className="tele-card tele-queue"><div className="tele-card-head"><div><h2>All loan cases</h2><p>Abhi Tele Caller ko sabhi loan cases dikh rahe hain; Field Executive access alag restricted hai.</p></div><span>{queue.length} loans</span></div><div className="tele-table-wrap"><table className="tele-table"><thead><tr><th>Register</th><th>Application</th><th>Customer</th><th>Phone</th><th>Loan</th><th>Status</th><th>Last call</th><th>Action</th></tr></thead><tbody>
        {queue.map(a => <tr key={a.id}><td><strong>{a.physical_register_serial_no || '—'}</strong></td><td>{a.application_no || '—'}</td><td>{a.customer_name || '—'}<small>{a.vehicle_model || ''}</small></td><td>{a.customer_phone || '—'}</td><td>{money(a.loan_amount_requested)}</td><td><span className="tele-status">{statusLabel(a.application_status)}</span></td><td>{a.last_call ? <><b>{a.last_call.outcome.replaceAll('_', ' ')}</b><small>{new Date(a.last_call.called_at).toLocaleString('en-IN')}</small></> : <span className="tele-muted">Not called</span>}</td><td><button className="tele-call-btn" onClick={() => { setActive(a); setForm({ outcome: 'connected', notes: '', callback_at: '' }); }}>☎ Call / update</button></td></tr>)}
        {!loading && !queue.length && <tr><td colSpan="8" className="tele-empty">No loan cases available.</td></tr>}
      </tbody></table></div></section>
    <CollectionActivity compact />
    </main>
    {active && <div className="tele-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setActive(null)}><form className="tele-modal" onSubmit={saveCall}><div className="tele-modal-head"><div><h2>Call update</h2><p>{active.application_no} · {active.customer_name} · {active.customer_phone}</p></div><button type="button" onClick={() => setActive(null)}>×</button></div><label>Call outcome<select value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })}>{OUTCOMES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><label>Callback date & time <span>(optional)</span><input type="datetime-local" value={form.callback_at} onChange={e => setForm({ ...form, callback_at: e.target.value })} /></label><label>Notes<textarea rows="4" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Customer se baat ka short note..." /></label><div className="tele-modal-actions"><button type="button" className="secondary-button" onClick={() => setActive(null)}>Cancel</button><button className="tele-primary" disabled={saving}>{saving ? 'Saving…' : 'Save call details'}</button></div></form></div>}
  </div>;
}
