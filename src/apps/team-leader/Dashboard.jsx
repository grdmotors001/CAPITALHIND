import ProfileMenu from '../../components/ProfileMenu';
import RoleNavigation from '../../components/RoleNavigation';
import CollectionActivity from '../../components/CollectionActivity';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, clearAppUserToken } from '../../utils/appUserAuth';
import { clearCurrentUser, getCurrentUser } from '../../utils/session';

export default function TeamLeaderDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser() || {};
  const [data, setData] = useState({ telecallers: [], registers: [] });
  const [form, setForm] = useState({ register_serial_no: '', telecaller_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function logout() { clearAppUserToken(); clearCurrentUser(); navigate('/login', { replace: true }); }
  async function load() {
    setLoading(true); setError('');
    try { setData(await apiGet('/api/team-leader', 'overview')); }
    catch (e) { setError(e.message || 'Could not load team leader dashboard'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function assign(e) {
    e.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const result = await apiPost('/api/team-leader', 'assign-register', form);
      setMessage(result.message || 'Register assigned.'); setForm({ register_serial_no: '', telecaller_id: '' }); await load();
    } catch (e) { setError(e.message || 'Could not assign register'); }
    finally { setSaving(false); }
  }
  async function unassign(id) {
    if (!window.confirm('Is physical register ko unassign karna hai?')) return;
    setError(''); setMessage('');
    try { const result = await apiPost('/api/team-leader', 'unassign-register', { id }); setMessage(result.message || 'Register unassigned.'); await load(); }
    catch (e) { setError(e.message || 'Could not unassign register'); }
  }

  return <div className="team-shell"><RoleNavigation role="team_leader" />
    <header className="team-header"><div><div className="team-brand">Capital Hind Finance</div><div className="team-sub">Team Leader Portal</div></div><div className="team-header-right"><span>{user.full_name || 'Team Leader'}</span><ProfileMenu compact /> <button onClick={logout}>↪ Logout</button></div></header>
    <main className="team-main">
      <div className="team-page-head"><div><div className="team-eyebrow">TELE CALLING MANAGEMENT</div><h1>Team Leader Dashboard</h1><p>Physical register / ledger ko Tele Caller ke saath assign aur manage karein.</p></div><button className="team-refresh" onClick={load} disabled={loading}>↻ Refresh</button></div>
      {error && <div className="team-error">⚠ {error}</div>}{message && <div className="team-success">✓ {message}</div>}
      <section className="team-kpis"><div><span>Tele Callers</span><strong>{data.telecallers.length}</strong></div><div><span>Assigned Registers</span><strong>{data.registers.filter(r => r.assigned_telecaller_id).length}</strong></div><div><span>Unassigned Registers</span><strong>{data.registers.filter(r => !r.assigned_telecaller_id).length}</strong></div><div><span>Loans Covered</span><strong>{data.registers.reduce((n, r) => n + Number(r.loan_count || 0), 0)}</strong></div></section>
      <section className="team-grid">
        <div className="team-card"><div className="team-card-head"><div><h2>Assign loan data to Tele Caller</h2><p>Loan Cases me saved Ledger / Register No. select karke Tele Caller ko assign karein.</p></div></div><form className="team-form" onSubmit={assign}><label>Ledger / Register No.<select value={form.register_serial_no} onChange={e => setForm({ ...form, register_serial_no: e.target.value })} required><option value="">Select Ledger / Register</option>{(data.available_registers || []).map(r => <option key={r.register_serial_no} value={r.register_serial_no}>{r.register_serial_no} · {r.loan_count || 0} loan{Number(r.loan_count || 0) === 1 ? '' : 's'}</option>)}</select></label><label>Tele Caller<select value={form.telecaller_id} onChange={e => setForm({ ...form, telecaller_id: e.target.value })} required><option value="">Select Tele Caller</option>{data.telecallers.map(t => <option key={t.id} value={t.id}>{t.full_name} · {t.phone || 'No phone'}</option>)}</select></label><button className="team-primary" disabled={saving}>{saving ? 'Assigning…' : 'Assign register'}</button></form></div>
        <div className="team-card"><div className="team-card-head"><div><h2>Tele Caller team</h2><p>Active calling staff.</p></div></div><div className="team-people">{data.telecallers.map(t => <div className="team-person" key={t.id}><span className="team-avatar">{(t.full_name || 'T').charAt(0).toUpperCase()}</span><div><strong>{t.full_name}</strong><small>{t.phone || t.email || 'Contact not set'}</small></div><b>{data.registers.filter(r => r.assigned_telecaller_id === t.id).length} registers</b></div>)}{!data.telecallers.length && <div className="team-empty">No active Tele Caller found.</div>}</div></div>
      </section>
      <section className="team-card"><div className="team-card-head"><div><h2>Tele Caller data assignments</h2><p>Ek Ledger / Register assign karne par us register ke saare linked loan cases Tele Caller ki calling queue me aa jayenge.</p></div></div><div className="team-table-wrap"><table className="team-table"><thead><tr><th>Register / Ledger</th><th>Tele Caller</th><th>Loans</th><th>Assigned</th><th>Action</th></tr></thead><tbody>{data.registers.map(r => <tr key={r.id}><td><strong>{r.register_serial_no}</strong></td><td>{r.telecaller_name || <span className="team-muted">Unassigned</span>}</td><td>{r.loan_count || 0}</td><td>{r.assigned_at ? new Date(r.assigned_at).toLocaleString('en-IN') : '—'}</td><td>{r.assigned_telecaller_id ? <button className="team-danger" onClick={() => unassign(r.id)}>Unassign</button> : <span className="team-muted">Ready</span>}</td></tr>)}{!loading && !data.registers.length && <tr><td colSpan="5" className="team-empty">No Ledger / Register wala loan abhi available nahi hai.</td></tr>}</tbody></table></div></section>
    <CollectionActivity compact />
    </main>
  </div>;
}
