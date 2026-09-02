import { useEffect, useRef, useState } from 'react';
import { getAdminToken } from '../apps/admin/api';
import { getDealerToken } from '../apps/dealer/api';
import { getAppUserToken } from '../utils/appUserAuth';
import { getStaffToken } from '../utils/staffAuth';
import { getCurrentUser, setCurrentUser } from '../utils/session';

function tokenForRole(role) {
  if (role === 'admin') return getAdminToken();
  if (role === 'dealer') return getDealerToken();
  if (role === 'staff' || role === 'cashier') return getStaffToken();
  return getAppUserToken();
}

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read photo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid photo'));
      img.onload = () => {
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfileMenu({ compact = false, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(getCurrentUser() || {});
  const [form, setForm] = useState({ full_name: '', dob: '', father_name: '', address: '', email: '', phone: '', profile_photo: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function loadProfile() {
    setLoading(true); setError('');
    try {
      const token = tokenForRole(profile.role);
      const res = await fetch('/api/users/profile', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not load profile');
      setProfile(data.profile || {});
      setForm({
        full_name: data.profile?.full_name || '',
        dob: data.profile?.dob || '',
        father_name: data.profile?.father_name || '',
        address: data.profile?.address || '',
        email: data.profile?.email || '',
        phone: data.profile?.phone || '',
        profile_photo: data.profile?.profile_photo || '',
      });
    } catch (e) { setError(e.message || 'Could not load profile'); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (open) loadProfile(); }, [open]);

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const token = tokenForRole(profile.role);
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...form, current_phone: profile.phone || '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not update profile');
      setProfile(data.profile || {});
      const next = { ...(getCurrentUser() || {}), ...data.profile, name: data.profile?.full_name, role: profile.role };
      setCurrentUser(next);
      onUpdated?.(data.profile);
      setOpen(false);
    } catch (e) { setError(e.message || 'Could not update profile'); }
    finally { setSaving(false); }
  }

  async function choosePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image.'); return; }
    try {
      const photo = await resizePhoto(file);
      setForm(f => ({ ...f, profile_photo: photo }));
      setError('');
    } catch (e) { setError(e.message || 'Could not process photo'); }
    e.target.value = '';
  }

  const initials = (profile.full_name || profile.name || 'U').trim().charAt(0).toUpperCase();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ border: '1px solid #e7d7cf', background: '#fff', borderRadius: 10, padding: compact ? '6px 10px' : '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, color: '#6e172c' }}>
        {profile.profile_photo ? <img src={profile.profile_photo} alt="Profile" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#f7e7dd', color: '#9b3c18' }}>{initials}</span>}
        <span>{compact ? 'Profile' : (profile.full_name || profile.name || 'Profile')}</span>
      </button>

      {open && <div role="dialog" aria-modal="true" onMouseDown={e => e.target === e.currentTarget && setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <form onSubmit={save} style={{ width: 'min(720px,100%)', maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div><h2 style={{ margin: 0, color: '#6e172c' }}>My Profile</h2><div style={{ color: '#777', marginTop: 4 }}>Update your personal details</div></div>
            <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: '#f4eeee', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>✕</button>
          </div>
          {error && <div className="admin-alert error" style={{ marginBottom: 12 }}>⚠ {error}</div>}
          {loading ? <div style={{ padding: 30, textAlign: 'center' }}>Loading profile…</div> : <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              {form.profile_photo ? <img src={form.profile_photo} alt="Profile preview" style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '3px solid #f2ddd2' }} /> : <div style={{ width: 76, height: 76, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#f7e7dd', fontSize: 28, fontWeight: 800, color: '#9b3c18' }}>{initials}</div>}
              <div><input ref={inputRef} type="file" accept="image/*" onChange={choosePhoto} style={{ display: 'none' }} /><button type="button" className="admin-btn secondary" onClick={() => inputRef.current?.click()}>📷 Change Photo</button><div style={{ fontSize: 12, color: '#777', marginTop: 5 }}>Photo is resized automatically.</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>Name<input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></label>
              <label>DOB<input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></label>
              <label>Father Name<input value={form.father_name} onChange={e => setForm({ ...form, father_name: e.target.value })} /></label>
              <label>Mobile No.<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 15) })} required /></label>
              <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
              <label style={{ gridColumn: '1 / -1' }}>Address<textarea rows="3" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}><button type="button" className="admin-btn secondary" onClick={() => setOpen(false)}>Cancel</button><button className="admin-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</button></div>
          </>}
        </form>
      </div>}
    </>
  );
}
