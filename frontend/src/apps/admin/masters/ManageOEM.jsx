import { useEffect, useState } from 'react';
import { createOEM, deleteOEM, listOems, updateOEM } from '../api';

export default function ManageOEM(){
  const [items,setItems]=useState([]),[name,setName]=useState(''),[editing,setEditing]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function load(){setLoading(true);setError('');try{const d=await listOems();setItems(d.items||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  async function add(e){e.preventDefault();setSaving(true);setError('');setMessage('');try{const d=await createOEM({oem_name:name});setMessage(d.message||'OEM created.');setName('');await load()}catch(e){setError(e.message)}finally{setSaving(false)}}
  async function save(e){e.preventDefault();setSaving(true);setError('');try{const d=await updateOEM(editing);setMessage(d.message||'OEM updated.');setEditing(null);await load()}catch(e){setError(e.message)}finally{setSaving(false)}}
  async function toggle(i){try{await updateOEM({id:i.id,is_active:!i.is_active});await load()}catch(e){setError(e.message)}}
  async function remove(i){if(!confirm(`Remove OEM "${i.oem_name}"?`))return;try{await deleteOEM(i.id);setMessage('OEM removed.');await load()}catch(e){setError(e.message)}}
  return <div className="admin-page"><div className="admin-page-head"><div><div className="admin-eyebrow">MASTERS</div><h1>OEM Master</h1><p>Vehicle manufacturer / OEM names used with vehicle models.</p></div><div className="admin-count">{items.length} OEM{items.length===1?'':'s'}</div></div>
    {message&&<div className="admin-alert success">✓ {message}</div>}{error&&<div className="admin-alert error">⚠ {error}</div>}
    <section className="admin-card staff-list-card"><div className="admin-card-title"><div><h2>OEM Records</h2><span>Manufacturer master list</span></div><button className="admin-btn secondary" onClick={load}>↻ Refresh</button></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>OEM Name</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading?<tr><td colSpan="3" className="empty-cell">Loading…</td></tr>:items.length===0?<tr><td colSpan="3" className="empty-cell">No OEM records found.</td></tr>:items.map(i=><tr key={i.id}><td><strong>{i.oem_name}</strong></td><td><span className={`role-pill ${i.is_active?'admin':'staff'}`}>{i.is_active?'Active':'Inactive'}</span></td><td className="actions-cell"><button className="admin-btn small secondary" onClick={()=>setEditing({...i})}>Edit</button> <button className="admin-btn small secondary" onClick={()=>toggle(i)}>{i.is_active?'Deactivate':'Activate'}</button> <button className="admin-btn small danger" onClick={()=>remove(i)}>Remove</button></td></tr>)}</tbody></table></div>
      {editing&&<form className="inline-edit" onSubmit={save}><div><label>OEM Name</label><input value={editing.oem_name||''} onChange={e=>setEditing({...editing,oem_name:e.target.value})} required/></div><div className="edit-actions"><button className="admin-btn" disabled={saving}>{saving?'Saving…':'Save changes'}</button><button type="button" className="admin-btn secondary" onClick={()=>setEditing(null)}>Cancel</button></div></form>}
    </section>
    <section className="admin-card create-card"><div className="admin-card-title"><div><h2>Add OEM</h2><span>Example: Mahindra, Piaggio, Bajaj, TVS</span></div></div><form className="staff-form" onSubmit={add}><div className="form-grid"><div><label>OEM Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="OEM / Manufacturer name" required/></div></div><button className="admin-btn" disabled={saving}>{saving?'Creating…':'+ Add OEM'}</button></form></section>
  </div>
}
