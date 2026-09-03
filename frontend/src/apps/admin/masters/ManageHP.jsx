import { useEffect, useState } from 'react';
import { createHP, deleteHP, listHP, updateHP } from '../api';

const emptyForm = { hp_name: '', hp_code: '', city: '', state: '' };

export default function ManageHP() {
  const [items, setItems] = useState([]);
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
      const data = await listHP();
      setItems(data.items || []);
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
      const data = await createHP(form);
      setMessage(data.message || 'HP record created.');
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(item) {
    setEditing({ ...item });
    setMessage(''); setError('');
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const data = await updateHP({
        id: editing.id,
        hp_name: editing.hp_name,
        hp_code: editing.hp_code || '',
        city: editing.city || '',
        state: editing.state || '',
      });
      setMessage(data.message || 'HP record updated.');
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item) {
    setError(''); setMessage('');
    try {
      const data = await updateHP({ id: item.id, is_active: !item.is_active });
      setMessage(data.message || 'HP record updated.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Remove HP record "${item.hp_name}"?`)) return;
    setError(''); setMessage('');
    try {
      const data = await deleteHP(item.id);
      setMessage(data.message || 'HP record removed.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="admin-eyebrow">MASTERS</div>
          <h1>HP (Hypothecation)</h1>
          <p>Entities under which vehicle RC hypothecation can be registered for a loan.</p>
        </div>
        <div className="admin-count">{items.length} record{items.length === 1 ? '' : 's'}</div>
      </div>

      {message && <div className="admin-alert success">✓ {message}</div>}
      {error && <div className="admin-alert error">⚠ {error}</div>}

      <section className="admin-card staff-list-card">
        <div className="admin-card-title">
          <div><h2>HP Records</h2><span>Existing hypothecation entities</span></div>
          <button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>HP Name</th><th>Code</th><th>City / State</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="empty-cell">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="empty-cell">No HP records found.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.hp_name}</strong></td>
                  <td>{item.hp_code || <span className="muted">—</span>}</td>
                  <td className="contact-text">
                    <div>{item.city || <span className="muted">No city</span>}</div>
                    <div>{item.state || <span className="muted">No state</span>}</div>
                  </td>
                  <td><span className={`role-pill ${item.is_active ? 'admin' : 'staff'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="actions-cell">
                    <button className="admin-btn small secondary" onClick={() => beginEdit(item)}>Edit</button>
                    <button className="admin-btn small secondary" onClick={() => toggleActive(item)}>{item.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button className="admin-btn small danger" onClick={() => remove(item)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <form className="inline-edit" onSubmit={saveEdit}>
            <div><label>HP Name</label><input value={editing.hp_name || ''} onChange={(e) => setEditing({ ...editing, hp_name: e.target.value })} required /></div>
            <div><label>HP Code</label><input value={editing.hp_code || ''} onChange={(e) => setEditing({ ...editing, hp_code: e.target.value })} /></div>
            <div><label>City</label><input value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
            <div><label>State</label><input value={editing.state || ''} onChange={(e) => setEditing({ ...editing, state: e.target.value })} /></div>
            <div className="edit-actions"><button className="admin-btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="admin-btn secondary" onClick={() => setEditing(null)}>Cancel</button></div>
          </form>
        )}
      </section>

      <section className="admin-card create-card">
        <div className="admin-card-title"><div><h2>Add HP Record</h2><span>New hypothecation entity</span></div></div>
        <form className="staff-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <div><label>HP Name</label><input value={form.hp_name} onChange={(e) => updateForm('hp_name', e.target.value)} required autoComplete="off" /></div>
            <div><label>HP Code <span>(optional)</span></label><input value={form.hp_code} onChange={(e) => updateForm('hp_code', e.target.value)} placeholder="CHFPL-HP-02" /></div>
            <div><label>City <span>(optional)</span></label><input value={form.city} onChange={(e) => updateForm('city', e.target.value)} /></div>
            <div><label>State <span>(optional)</span></label><input value={form.state} onChange={(e) => updateForm('state', e.target.value)} /></div>
          </div>
          <button className="admin-btn" disabled={saving}>{saving ? 'Creating…' : '+ Add HP record'}</button>
        </form>
      </section>
    </div>
  );
}
