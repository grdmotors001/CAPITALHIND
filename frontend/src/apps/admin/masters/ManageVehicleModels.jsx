import { useEffect, useState } from 'react';
import {
  createVehicleModel,
  deleteVehicleModel,
  listOems,
  listVehicleModelsAdmin,
  updateVehicleModel,
} from '../api';

const emptyForm = { model_name: '', vehicle_type: '2W', ex_showroom_price: '', oem_id: '', battery_capacity: '' };

export default function ManageVehicleModels() {
  const [items, setItems] = useState([]);
  const [oems, setOems] = useState([]);
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
      const [modelsData, oemsData] = await Promise.all([listVehicleModelsAdmin(), listOems()]);
      setItems(modelsData.items || []);
      setOems(oemsData.items || []);
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
      const data = await createVehicleModel({
        ...form,
        oem_id: form.oem_id || null,
        ex_showroom_price: Number(form.ex_showroom_price),
      });
      setMessage(data.message || 'Vehicle model created.');
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(item) {
    setEditing({ ...item, oem_id: item.oem_id || '' });
    setMessage(''); setError('');
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const data = await updateVehicleModel({
        id: editing.id,
        model_name: editing.model_name,
        vehicle_type: editing.vehicle_type,
        ex_showroom_price: Number(editing.ex_showroom_price),
        oem_id: editing.oem_id || null,
        battery_capacity: editing.battery_capacity || '',
      });
      setMessage(data.message || 'Vehicle model updated.');
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
      const data = await updateVehicleModel({ id: item.id, is_active: !item.is_active });
      setMessage(data.message || 'Vehicle model updated.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Remove vehicle model "${item.model_name}"?`)) return;
    setError(''); setMessage('');
    try {
      const data = await deleteVehicleModel(item.id);
      setMessage(data.message || 'Vehicle model removed.');
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
          <h1>Vehicle Model</h1>
          <p>OEMs, models, ex-showroom price and battery capacity used across dealer loan applications.</p>
        </div>
        <div className="admin-count">{items.length} model{items.length === 1 ? '' : 's'}</div>
      </div>

      {message && <div className="admin-alert success">✓ {message}</div>}
      {error && <div className="admin-alert error">⚠ {error}</div>}

      <section className="admin-card staff-list-card">
        <div className="admin-card-title">
          <div><h2>Vehicle Models</h2><span>Existing models</span></div>
          <button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Model</th><th>OEM</th><th>Type</th><th>Ex-showroom Price</th><th>Battery</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty-cell">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="7" className="empty-cell">No vehicle models found.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.model_name}</strong></td>
                  <td>{item.oem_name || <span className="muted">—</span>}</td>
                  <td>{item.vehicle_type}</td>
                  <td>₹{Number(item.ex_showroom_price).toLocaleString('en-IN')}</td>
                  <td>{item.battery_capacity || <span className="muted">—</span>}</td>
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
            <div><label>Model Name</label><input value={editing.model_name || ''} onChange={(e) => setEditing({ ...editing, model_name: e.target.value })} required /></div>
            <div>
              <label>OEM</label>
              <select value={editing.oem_id || ''} onChange={(e) => setEditing({ ...editing, oem_id: e.target.value })}>
                <option value="">— None —</option>
                {oems.map((oem) => <option key={oem.id} value={oem.id}>{oem.oem_name}</option>)}
              </select>
            </div>
            <div>
              <label>Vehicle Type</label>
              <select value={editing.vehicle_type || '2W'} onChange={(e) => setEditing({ ...editing, vehicle_type: e.target.value })}>
                <option value="2W">2W</option>
                <option value="3W">3W</option>
                <option value="4W">4W</option>
              </select>
            </div>
            <div><label>Ex-showroom Price</label><input type="number" min="0" step="0.01" value={editing.ex_showroom_price || ''} onChange={(e) => setEditing({ ...editing, ex_showroom_price: e.target.value })} required /></div>
            <div><label>Battery Capacity <span>(optional)</span></label><input value={editing.battery_capacity || ''} onChange={(e) => setEditing({ ...editing, battery_capacity: e.target.value })} /></div>
            <div className="edit-actions"><button className="admin-btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="admin-btn secondary" onClick={() => setEditing(null)}>Cancel</button></div>
          </form>
        )}
      </section>

      <section className="admin-card create-card">
        <div className="admin-card-title"><div><h2>Add Vehicle Model</h2><span>New model</span></div></div>
        <form className="staff-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <div><label>Model Name</label><input value={form.model_name} onChange={(e) => updateForm('model_name', e.target.value)} required autoComplete="off" /></div>
            <div>
              <label>OEM <span>(optional)</span></label>
              <select value={form.oem_id} onChange={(e) => updateForm('oem_id', e.target.value)}>
                <option value="">— None —</option>
                {oems.map((oem) => <option key={oem.id} value={oem.id}>{oem.oem_name}</option>)}
              </select>
            </div>
            <div>
              <label>Vehicle Type</label>
              <select value={form.vehicle_type} onChange={(e) => updateForm('vehicle_type', e.target.value)}>
                <option value="2W">2W</option>
                <option value="3W">3W</option>
                <option value="4W">4W</option>
              </select>
            </div>
            <div><label>Ex-showroom Price</label><input type="number" min="0" step="0.01" value={form.ex_showroom_price} onChange={(e) => updateForm('ex_showroom_price', e.target.value)} required /></div>
            <div><label>Battery Capacity <span>(optional)</span></label><input value={form.battery_capacity} onChange={(e) => updateForm('battery_capacity', e.target.value)} placeholder="e.g. 3.5 kWh" /></div>
          </div>
          <button className="admin-btn" disabled={saving}>{saving ? 'Creating…' : '+ Add vehicle model'}</button>
        </form>
      </section>
    </div>
  );
}
