import { useEffect, useState } from 'react';
import { createLoanType, deleteLoanType, listLoanTypes, updateLoanType } from '../api';

const emptyForm = { loan_type_name: '', description: '' };

export default function ManageLoanTypes() {
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
      const data = await listLoanTypes();
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
      const data = await createLoanType(form);
      setMessage(data.message || 'Loan type created.');
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
      const data = await updateLoanType({
        id: editing.id,
        loan_type_name: editing.loan_type_name,
        description: editing.description || '',
      });
      setMessage(data.message || 'Loan type updated.');
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
      const data = await updateLoanType({ id: item.id, is_active: !item.is_active });
      setMessage(data.message || 'Loan type updated.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Remove loan type "${item.loan_type_name}"?`)) return;
    setError(''); setMessage('');
    try {
      const data = await deleteLoanType(item.id);
      setMessage(data.message || 'Loan type removed.');
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
          <h1>Loan Type</h1>
          <p>Loan types available for selection on dealer/staff loan applications.</p>
        </div>
        <div className="admin-count">{items.length} type{items.length === 1 ? '' : 's'}</div>
      </div>

      {message && <div className="admin-alert success">✓ {message}</div>}
      {error && <div className="admin-alert error">⚠ {error}</div>}

      <section className="admin-card staff-list-card">
        <div className="admin-card-title">
          <div><h2>Loan Types</h2><span>Existing loan types</span></div>
          <button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Loan Type</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="empty-cell">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="4" className="empty-cell">No loan types found.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.loan_type_name}</strong></td>
                  <td className="contact-text">{item.description || <span className="muted">No description</span>}</td>
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
            <div><label>Loan Type Name</label><input value={editing.loan_type_name || ''} onChange={(e) => setEditing({ ...editing, loan_type_name: e.target.value })} required /></div>
            <div><label>Description</label><input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="edit-actions"><button className="admin-btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="admin-btn secondary" onClick={() => setEditing(null)}>Cancel</button></div>
          </form>
        )}
      </section>

      <section className="admin-card create-card">
        <div className="admin-card-title"><div><h2>Add Loan Type</h2><span>New loan type</span></div></div>
        <form className="staff-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <div><label>Loan Type Name</label><input value={form.loan_type_name} onChange={(e) => updateForm('loan_type_name', e.target.value)} required autoComplete="off" /></div>
            <div className="full"><label>Description <span>(optional)</span></label><input value={form.description} onChange={(e) => updateForm('description', e.target.value)} /></div>
          </div>
          <button className="admin-btn" disabled={saving}>{saving ? 'Creating…' : '+ Add loan type'}</button>
        </form>
      </section>
    </div>
  );
}
