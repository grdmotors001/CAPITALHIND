import { useEffect, useState } from 'react';
import { createUser, deleteUser, listUsers, updateUser } from './api';

const emptyForm = { full_name: '', phone: '', password: '', role: 'field_executive', email: '' };

const ROLE_LABELS = {
  field_executive: 'Field Executive',
  tele_caller: 'Tele Caller',
  customer: 'Customer',
  admin: 'Admin',
  do: 'Disbursement Officer',
  team_leader: 'Team Leader',
};

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await listUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const data = await createUser(form);
      setMessage(data.message || 'Account created successfully.');
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(user) {
    setEditing({ ...user });
    setMessage(''); setError('');
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const data = await updateUser({
        id: editing.id,
        phone: editing.phone || '',
        email: editing.email || '',
      });
      setMessage(data.message || 'Account updated.');
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(user) {
    if (!window.confirm(`Remove account "${user.full_name}"?`)) return;
    setError(''); setMessage('');
    try {
      const data = await deleteUser(user.id);
      setMessage(data.message || 'Account removed.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="admin-eyebrow">ADMINISTRATION</div>
          <h1>Manage Users</h1>
          <p>Create Field Executive, Tele Caller, Customer & Admin accounts (used for app login).</p>
        </div>
        <div className="admin-count">{users.length} account{users.length === 1 ? '' : 's'}</div>
      </div>

      {message && <div className="admin-alert success">✓ {message}</div>}
      {error && <div className="admin-alert error">⚠ {error}</div>}

      <section className="admin-card staff-list-card">
        <div className="admin-card-title">
          <div><h2>User Accounts</h2><span>Existing accounts</span></div>
          <button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Role</th><th>Phone / Email</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="empty-cell">Loading accounts…</td></tr> : users.length === 0 ? <tr><td colSpan="5" className="empty-cell">No accounts found.</td></tr> : users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.full_name}</strong></td>
                  <td><span className={`role-pill ${user.role}`}>{ROLE_LABELS[user.role] || user.role}</span></td>
                  <td className="contact-text">
                    <div>{user.phone || <span className="muted">No phone</span>}</div>
                    <div>{user.email || <span className="muted">No email</span>}</div>
                  </td>
                  <td>{user.created_at ? user.created_at.slice(0, 10) : '—'}</td>
                  <td className="actions-cell">
                    <button className="admin-btn small secondary" onClick={() => beginEdit(user)}>Edit contact</button>
                    {user.is_current ? <span className="you-tag">You</span> : <button className="admin-btn small danger" onClick={() => remove(user)}>Remove</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <form className="inline-edit" onSubmit={saveEdit}>
            <div><label>Phone (login)</label><input maxLength="10" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="98xxxxxxxx" /></div>
            <div><label>Email</label><input type="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="name@gmail.com" /></div>
            <div className="edit-actions"><button className="admin-btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="admin-btn secondary" onClick={() => setEditing(null)}>Cancel</button></div>
          </form>
        )}
      </section>

      <section className="admin-card create-card">
        <div className="admin-card-title"><div><h2>Add User Account</h2><span>New login credentials</span></div></div>
        <form className="staff-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <div><label>Full name</label><input value={form.full_name} onChange={(e) => updateForm('full_name', e.target.value)} required autoComplete="off" /></div>
            <div><label>Phone <span>(login id, 10 digits)</span></label><input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} maxLength="10" placeholder="98xxxxxxxx" required /></div>
            <div><label>Password <span>(minimum 8 characters)</span></label><input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} minLength="8" required autoComplete="new-password" /></div>
            <div>
              <label>Role</label>
              <select value={form.role} onChange={(e) => updateForm('role', e.target.value)}>
                <option value="field_executive">Field Executive — visits, FIR, KYC upload, collections</option>
                <option value="tele_caller">Tele Caller — calling & follow-up queue</option>
                <option value="customer">Customer — payment portal only</option>
                <option value="do">Disbursement Officer — reviews FI, approves/rejects loans</option>
                <option value="team_leader">Team Leader — assigns physical ledgers/registers to Tele Callers</option>
                <option value="admin">Admin — full access, manage accounts</option>
              </select>
            </div>
            <div className="full"><label>Email <span>(optional)</span></label><input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="name@gmail.com" /></div>
          </div>
          <button className="admin-btn" disabled={saving}>{saving ? 'Creating…' : '+ Create account'}</button>
        </form>
      </section>
    </div>
  );
}
