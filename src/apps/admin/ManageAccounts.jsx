import { useEffect, useMemo, useState } from 'react';
import {
  createDealer, createUser, deleteDealer, deleteUser,
  listDealers, listUsers, updateDealer, updateUser, listStaff, createStaff, deleteStaff, updateStaffContact,
} from './api';

const EMPTY = { type: 'user', full_name: '', phone: '', password: '', role: 'field_executive', email: '', dealer_name: '', dealer_code: '' };
const ROLE_LABELS = {
  staff: 'Staff', admin: 'Admin', field_executive: 'Field Executive', tele_caller: 'Tele Caller',
  customer: 'Customer', do: 'Disbursement Officer', team_leader: 'Team Leader', dealer: 'Dealer',
};

export default function ManageAccounts() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [u, d, st] = await Promise.all([listUsers(), listDealers(), listStaff()]);
      setUsers(u.users || []); setDealers(d.dealers || []);
      setStaffRows((st.users || []).filter(x => x.source === 'staff_accounts'));
    } catch (e) { setError(e.message || 'Could not load accounts.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const total = users.length + dealers.length + staffRows.length;
  const dealerLogins = useMemo(() => dealers.reduce((n, d) => n + (d.users || []).length, 0), [dealers]);
  function setField(k, v) { setForm(x => ({ ...x, [k]: v })); }
  function resetForm() { setForm(EMPTY); }
  function clearAlerts() { setError(''); setMessage(''); }

  async function createAccount(e) {
    e.preventDefault(); setSaving(true); clearAlerts();
    try {
      let data;
      if (form.type === 'dealer') {
        data = await createDealer({ dealer_name: form.dealer_name, dealer_code: form.dealer_code, full_name: form.full_name, phone: form.phone, password: form.password });
      } else if (form.type === 'cashier') {
        data = await createStaff({ username: form.full_name, contact_mobile: form.phone, password: form.password, role: 'cashier', email: form.email });
      } else {
        data = await createUser({ full_name: form.full_name, phone: form.phone, password: form.password, role: form.role, email: form.email });
      }
      setMessage(data.message || 'Account created successfully.'); resetForm(); await load();
    } catch (e) { setError(e.message || 'Could not create account.'); }
    finally { setSaving(false); }
  }

  async function saveEdit(e) {
    e.preventDefault(); setSaving(true); clearAlerts();
    try {
      let data;
      if (editing.kind === 'dealer') {
        data = await updateDealer({ id: editing.id, dealer_name: editing.dealer_name, dealer_code: editing.dealer_code });
      } else if (editing.kind === 'staff') {
        data = await updateStaffContact({ id: editing.id, role: editing.role, source: 'staff_accounts', contact_mobile: editing.contact_mobile || '', email: editing.email || '' });
      } else {
        data = await updateUser({ id: editing.id, phone: editing.phone || '', email: editing.email || '' });
      }
      setMessage(data.message || 'Account updated.'); setEditing(null); await load();
    } catch (e) { setError(e.message || 'Could not update account.'); }
    finally { setSaving(false); }
  }

  async function remove(item) {
    const label = item.kind === 'dealer' ? item.dealer_name : (item.full_name || item.username);
    if (!window.confirm(`Remove "${label}"?`)) return;
    clearAlerts();
    try {
      const data = item.kind === 'dealer' ? await deleteDealer(item.id) : (item.kind === 'staff' ? await deleteStaff(item) : await deleteUser(item.id));
      setMessage(data.message || 'Account removed.'); await load();
    } catch (e) { setError(e.message || 'Could not remove account.'); }
  }

  return <div className="admin-page">
    <div className="admin-page-head">
      <div><div className="admin-eyebrow">ADMINISTRATION</div><h1>Manage Accounts</h1><p>Team users, dealers aur Cashier accounts yahin se manage honge.</p></div>
      <div className="admin-count">{total} accounts · {dealers.length} dealers</div>
    </div>
    {message && <div className="admin-alert success">✓ {message}</div>}
    {error && <div className="admin-alert error">⚠ {error}</div>}

    <div className="account-tabs">
      <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Team Users ({users.length})</button>
      <button className={tab === 'dealers' ? 'active' : ''} onClick={() => setTab('dealers')}>Dealers ({dealers.length})</button>
      <button className={tab === 'cashiers' ? 'active' : ''} onClick={() => setTab('cashiers')}>Cashiers ({staffRows.length})</button>
    </div>

    {tab === 'users' && <AccountTable loading={loading} rows={users} kind="user" onEdit={setEditing} onRemove={remove} />}
    {tab === 'dealers' && <DealerTable loading={loading} rows={dealers} onEdit={setEditing} onRemove={remove} />}
    {tab === 'cashiers' && <AccountTable loading={loading} rows={staffRows} kind="staff" onEdit={setEditing} onRemove={remove} />}

    <section className="admin-card create-card">
      <div className="admin-card-title"><div><h2>+ Create New Account</h2><span>Dealer login bhi isi screen se create hoga</span></div><button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button></div>
      <form className="staff-form" onSubmit={createAccount}>
        <div className="account-create-type">
          {['user', 'dealer', 'cashier'].map(t => <button type="button" key={t} className={form.type === t ? 'active' : ''} onClick={() => { setField('type', t); if (t === 'user') setField('role', 'field_executive'); clearAlerts(); }}>{t === 'user' ? 'Team User' : (t === 'cashier' ? 'Cashier' : 'Dealer')}</button>)}
        </div>
        {form.type === 'dealer' ? <div className="form-grid">
          <div><label>Dealer Name</label><input value={form.dealer_name} onChange={e => setField('dealer_name', e.target.value)} required /></div>
          <div><label>Dealer Code</label><input value={form.dealer_code} onChange={e => setField('dealer_code', e.target.value.toUpperCase())} required placeholder="DLR001" /></div>
          <div><label>Dealer Login Name</label><input value={form.full_name} onChange={e => setField('full_name', e.target.value)} required /></div>
          <div><label>Mobile / Login ID <span>(10 digits)</span></label><input value={form.phone} onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength="10" required placeholder="98xxxxxxxx" /></div>
          <div><label>Password <span>(minimum 8 characters)</span></label><input type="password" value={form.password} onChange={e => setField('password', e.target.value)} minLength="8" required /></div>
        </div> : <div className="form-grid">
          <div><label>{form.type === 'cashier' ? 'Cashier Name / Username' : 'Full Name'}</label><input value={form.full_name} onChange={e => setField('full_name', e.target.value)} required /></div>
          <div><label>Phone <span>(10 digits)</span></label><input value={form.phone} onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength="10" required={form.type === 'user'} /></div>
          <div><label>Password <span>(minimum 8 characters)</span></label><input type="password" value={form.password} onChange={e => setField('password', e.target.value)} minLength="8" required /></div>
          {form.type === 'user' && <div><label>Role</label><select value={form.role} onChange={e => setField('role', e.target.value)}><option value="field_executive">Field Executive</option><option value="tele_caller">Tele Caller</option><option value="do">Disbursement Officer</option><option value="team_leader">Team Leader</option><option value="customer">Customer</option><option value="admin">Admin</option></select></div>}
          <div><label>Email <span>(optional)</span></label><input type="email" value={form.email} onChange={e => setField('email', e.target.value)} /></div>
        </div>}
        <button className="admin-btn" disabled={saving}>{saving ? 'Creating…' : 'Create account'}</button>
      </form>
    </section>

    {editing && <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={saveEdit}>
      <div className="admin-modal-head"><div><h2>Edit Account</h2><p>Contact / dealer details update karein.</p></div><button type="button" onClick={() => setEditing(null)}>×</button></div>
      {editing.kind === 'dealer' ? <div className="form-grid"><div><label>Dealer Name</label><input value={editing.dealer_name || ''} onChange={e => setEditing({...editing, dealer_name:e.target.value})} required /></div><div><label>Dealer Code</label><input value={editing.dealer_code || ''} onChange={e => setEditing({...editing, dealer_code:e.target.value.toUpperCase()})} required /></div></div> : <div className="form-grid"><div><label>Name</label><input value={editing.username || editing.full_name || ''} disabled /></div><div><label>Phone</label><input value={editing.contact_mobile ?? editing.phone ?? ''} onChange={e => setEditing({...editing, ...({phone:e.target.value.replace(/\D/g,'').slice(0,10)})})} maxLength="10" /></div><div className="full"><label>Email</label><input type="email" value={editing.email || ''} onChange={e => setEditing({...editing,email:e.target.value})} /></div></div>}
      <div className="edit-actions"><button className="admin-btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="admin-btn secondary" onClick={() => setEditing(null)}>Cancel</button></div>
    </form></div>}
  </div>;
}

function AccountTable({ loading, rows, kind, onEdit, onRemove }) {
  return <section className="admin-card staff-list-card"><div className="admin-card-title"><div><h2>{kind === 'staff' ? 'Staff & Admin Accounts' : 'Team User Accounts'}</h2><span>Existing accounts</span></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Role</th><th>Phone / Email</th><th>Added</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="5" className="empty-cell">Loading accounts…</td></tr> : rows.length === 0 ? <tr><td colSpan="5" className="empty-cell">No accounts found.</td></tr> : rows.map(u => <tr key={`${kind}-${u.id}`}><td><strong>{u.username || u.full_name}</strong></td><td><span className={`role-pill ${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span></td><td className="contact-text"><div>{u.contact_mobile || u.phone || <span className="muted">No phone</span>}</div><div>{u.email || <span className="muted">No email</span>}</div></td><td>{String(u.created_at || '').slice(0,10) || '—'}</td><td className="actions-cell"><button className="admin-btn small secondary" onClick={() => onEdit({...u, kind})}>Edit</button>{u.is_current ? <span className="you-tag">You</span> : <button className="admin-btn small danger" onClick={() => onRemove({...u, kind})}>Remove</button>}</td></tr>)}</tbody></table></div></section>;
}

function DealerTable({ loading, rows, onEdit, onRemove }) {
  return <section className="admin-card staff-list-card"><div className="admin-card-title"><div><h2>Dealer Accounts</h2><span>Dealer master + dealer login</span></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Dealer</th><th>Code</th><th>Login User</th><th>Mobile</th><th>Added</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="empty-cell">Loading dealers…</td></tr> : rows.length === 0 ? <tr><td colSpan="6" className="empty-cell">No dealers found.</td></tr> : rows.map(d => { const u=(d.users||[])[0]; return <tr key={d.id}><td><strong>{d.dealer_name}</strong></td><td><span className="role-pill dealer">{d.dealer_code}</span></td><td>{u?.full_name || '—'}</td><td>{u?.phone || '—'}</td><td>{String(d.created_at || '').slice(0,10) || '—'}</td><td className="actions-cell"><button className="admin-btn small secondary" onClick={() => onEdit({...d, kind:'dealer'})}>Edit</button><button className="admin-btn small danger" onClick={() => onRemove({...d, kind:'dealer'})}>Remove</button></td></tr>; })}</tbody></table></div></section>;
}
