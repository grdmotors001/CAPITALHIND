import { useEffect, useState } from 'react';
import { createStaff, deleteStaff, listStaff, updateStaffContact } from './api';

const emptyForm = { username: '', password: '', role: 'staff', contact_mobile: '', email: '' };

export default function ManageStaff() {
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
      const data = await listStaff();
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
      const data = await createStaff(form);
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
      const data = await updateStaffContact({
        id: editing.id,
        contact_mobile: editing.contact_mobile || '',
        email: editing.email || '',
      });
      setMessage(data.message || 'Contact details updated.');
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(user) {
    if (!window.confirm(`Remove account "${user.username}"?`)) return;
    setError(''); setMessage('');
    try {
      const data = await deleteStaff(user.id);
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
          <h1>Manage Staff</h1>
          <p>Create staff/admin accounts and manage OTP & Google-login contact details.</p>
        </div>
        <div className="admin-count">{users.length} account{users.length === 1 ? '' : 's'}</div>
      </div>

      {message && <div className="admin-alert success">✓ {message}</div>}
      {error && <div className="admin-alert error">⚠ {error}</div>}

      <section className="admin-card staff-list-card">
        <div className="admin-card-title">
          <div><h2>Staff & Admin Accounts</h2><span>Existing accounts</span></div>
          <button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Username</th><th>Role</th><th>Mobile / Email</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="empty-cell">Loading accounts…</td></tr> : users.length === 0 ? <tr><td colSpan="5" className="empty-cell">No staff accounts found.</td></tr> : users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.username}</strong></td>
                  <td><span className={`role-pill ${user.role}`}>{user.role}</span></td>
                  <td className="contact-text">
                    <div>{user.contact_mobile || <span className="muted">No mobile</span>}</div>
                    <div>{user.email || <span className="muted">No email</span>}</div>
                  </td>
                  <td>{user.created_at || '—'}</td>
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
            <div><label>Mobile (OTP login)</label><input maxLength="15" value={editing.contact_mobile || ''} onChange={(e) => setEditing({ ...editing, contact_mobile: e.target.value })} placeholder="98xxxxxxxx" /></div>
            <div><label>Email (Google login)</label><input type="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="name@gmail.com" /></div>
            <div className="edit-actions"><button className="admin-btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="admin-btn secondary" onClick={() => setEditing(null)}>Cancel</button></div>
          </form>
        )}
      </section>

      <section className="admin-card create-card">
        <div className="admin-card-title"><div><h2>Add Staff / Admin Account</h2><span>New login credentials</span></div></div>
        <form className="staff-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <div><label>Username</label><input value={form.username} onChange={(e) => updateForm('username', e.target.value)} required autoComplete="off" /></div>
            <div><label>Password <span>(minimum 8 characters)</span></label><input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} minLength="8" required autoComplete="new-password" /></div>
            <div><label>Role</label><select value={form.role} onChange={(e) => updateForm('role', e.target.value)}><option value="staff">Staff — view records & verify/reject UPI payments</option><option value="admin">Admin — staff permissions + manage accounts</option></select></div>
            <div><label>Mobile <span>(optional — OTP login)</span></label><input value={form.contact_mobile} onChange={(e) => updateForm('contact_mobile', e.target.value)} maxLength="15" placeholder="98xxxxxxxx" /></div>
            <div className="full"><label>Email <span>(optional — Google login)</span></label><input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="name@gmail.com" /></div>
          </div>
          <button className="admin-btn" disabled={saving}>{saving ? 'Creating…' : '+ Create account'}</button>
        </form>
      </section>
    </div>
  );
}
