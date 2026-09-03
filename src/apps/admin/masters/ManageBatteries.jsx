import { useEffect, useState } from 'react';
import { createBattery, deleteBattery, listBatteries, updateBattery } from '../api';

export default function ManageBatteries() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { const d = await listBatteries(); setItems(d.items || []); }
    catch (e) { setError(e.message || 'Could not load battery master.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { const d = await createBattery({ battery_name: name }); setMessage(d.message || 'Battery added.'); setName(''); await load(); }
    catch (e) { setError(e.message || 'Could not create battery.'); }
    finally { setSaving(false); }
  }
  async function save(e) {
    e.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { const d = await updateBattery({ id: editing.id, battery_name: editing.battery_name }); setMessage(d.message || 'Battery updated.'); setEditing(null); await load(); }
    catch (e) { setError(e.message || 'Could not update battery.'); }
    finally { setSaving(false); }
  }
  async function toggle(item) {
    setError(''); setMessage('');
    try { const d = await updateBattery({ id: item.id, is_active: !item.is_active }); setMessage(d.message || 'Battery updated.'); await load(); }
    catch (e) { setError(e.message || 'Could not update battery.'); }
  }
  async function remove(item) {
    if (!window.confirm(`Remove battery "${item.battery_name}"?`)) return;
    setError(''); setMessage('');
    try { const d = await deleteBattery(item.id); setMessage(d.message || 'Battery removed.'); await load(); }
    catch (e) { setError(e.message || 'Could not remove battery.'); }
  }

  return <div className="admin-page">
    <div className="admin-page-head"><div><div className="admin-eyebrow">MASTERS</div><h1>Battery Master</h1><p>Battery names available when a Field Executive records a Vehicle Repo.</p></div><div className="admin-count">{items.length} batteries</div></div>
    {message && <div className="admin-alert success">✓ {message}</div>}{error && <div className="admin-alert error">⚠ {error}</div>}
    <section className="admin-card staff-list-card"><div className="admin-card-title"><div><h2>Battery Names</h2><span>Only active names appear in the Repo form dropdown.</span></div><button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Battery Name</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="3" className="empty-cell">Loading…</td></tr> : !items.length ? <tr><td colSpan="3" className="empty-cell">No battery names found.</td></tr> : items.map(item => <tr key={item.id}><td><strong>{item.battery_name}</strong></td><td><span className={`role-pill ${item.is_active ? 'admin' : 'staff'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></td><td className="actions-cell"><button className="admin-btn small secondary" onClick={() => setEditing({ ...item })}>Edit</button><button className="admin-btn small secondary" onClick={() => toggle(item)}>{item.is_active ? 'Deactivate' : 'Activate'}</button><button className="admin-btn small danger" onClick={() => remove(item)}>Remove</button></td></tr>)}
      </tbody></table></div>
      {editing && <form className="inline-edit" onSubmit={save}><div><label>Battery Name</label><input value={editing.battery_name || ''} onChange={e => setEditing({ ...editing, battery_name: e.target.value })} required /></div><div className="edit-actions"><button className="admin-btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="admin-btn secondary" onClick={() => setEditing(null)}>Cancel</button></div></form>}
    </section>
    <section className="admin-card create-card"><div className="admin-card-title"><div><h2>Add Battery</h2><span>Create a new battery name for the Repo dropdown.</span></div></div><form className="staff-form" onSubmit={add}><div className="form-grid"><div><label>Battery Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Exide 12V" required /></div></div><button className="admin-btn" disabled={saving}>{saving ? 'Creating…' : '+ Add battery'}</button></form></section>
  </div>;
}
