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

async function profileRequest(method, token, body) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body) headers['Content-Type'] = 'application/json';

  // Primary route. The fallback keeps profile usable on deployments that still
  // have the older /api/users?path=profile rewrite.
  let res = await fetch('/api/users/profile', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = await res.json().catch(() => ({}));

  if (res.status === 404 && data?.error?.includes('/profile')) {
    res = await fetch('/api/profile', {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    data = await res.json().catch(() => ({}));
  }
  return { res, data };
}

export default function ProfileMenu({ compact = false, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(getCurrentUser() || {});
  const [form, setForm] = useState({ full_name: '', dob: '', father_name: '', address: '', email: '', phone: '', profile_photo: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const inputRef = useRef(null);

  async function loadProfile() {
    setLoading(true); setError(''); setSaved('');
    try {
      const token = tokenForRole(profile.role);
      const { res, data } = await profileRequest('GET', token);
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
    e.preventDefault(); setSaving(true); setError(''); setSaved('');
    try {
      const token = tokenForRole(profile.role);
      const { res, data } = await profileRequest('PATCH', token, { ...form, current_phone: profile.phone || '' });
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not update profile');
      setProfile(data.profile || {});
      const next = { ...(getCurrentUser() || {}), ...data.profile, name: data.profile?.full_name, role: profile.role };
      setCurrentUser(next);
      onUpdated?.(data.profile);
      setSaved('Profile updated successfully');
      setTimeout(() => setOpen(false), 650);
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

  const initials = (profile.full_name || profile.name || form.full_name || 'U').trim().charAt(0).toUpperCase();
  const roleLabel = ({ field_executive: 'Field Executive', tele_caller: 'Tele Caller', team_leader: 'Team Leader', cashier: 'Cashier', staff: 'Staff', dealer: 'Dealer', customer: 'Customer', do: 'Disbursement Officer', admin: 'Administrator' })[profile.role] || 'User';

  return (
    <>
      <button type="button" className={`profile-trigger ${compact ? 'profile-trigger-compact' : ''}`} onClick={() => setOpen(true)} aria-label="Open my profile">
        {profile.profile_photo ? <img src={profile.profile_photo} alt="Profile" /> : <span className="profile-avatar-small">{initials}</span>}
        <span className="profile-trigger-name">{compact ? 'Profile' : (profile.full_name || profile.name || 'Profile')}</span>
      </button>

      {open && <div className="profile-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
        <form className="profile-modal" onSubmit={save}>
          <div className="profile-modal-head">
            <div>
              <div className="profile-eyebrow">ACCOUNT SETTINGS</div>
              <h2>My Profile</h2>
              <p>Keep your personal and contact details up to date.</p>
            </div>
            <button type="button" className="profile-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          {error && <div className="profile-alert profile-alert-error">⚠ <span>{error}</span></div>}
          {saved && <div className="profile-alert profile-alert-success">✓ <span>{saved}</span></div>}

          {loading ? <div className="profile-loading"><div className="profile-spinner" />Loading your profile…</div> : <>
            <div className="profile-identity-card">
              <div className="profile-avatar-large">
                {form.profile_photo ? <img src={form.profile_photo} alt="Profile preview" /> : <span>{initials}</span>}
              </div>
              <div className="profile-identity-copy">
                <strong>{form.full_name || profile.full_name || profile.name || 'Your Name'}</strong>
                <span>{roleLabel}</span>
                <small>JPG/PNG photo · automatically resized</small>
              </div>
              <input ref={inputRef} type="file" accept="image/*" onChange={choosePhoto} hidden />
              <button type="button" className="profile-photo-btn" onClick={() => inputRef.current?.click()}>📷 Change Photo</button>
            </div>

            <div className="profile-section-title">Personal details</div>
            <div className="profile-grid">
              <label className="profile-field"><span>Full Name <b>*</b></span><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required placeholder="Enter full name" /></label>
              <label className="profile-field"><span>Date of Birth</span><input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></label>
              <label className="profile-field"><span>Father Name</span><input value={form.father_name} onChange={e => setForm({ ...form, father_name: e.target.value })} placeholder="Enter father name" /></label>
              <label className="profile-field"><span>Mobile Number <b>*</b></span><input inputMode="numeric" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 15) })} required placeholder="Enter mobile number" /></label>
              <label className="profile-field"><span>Email Address</span><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></label>
              <label className="profile-field profile-field-full"><span>Address</span><textarea rows="3" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Enter complete address" /></label>
            </div>

            <div className="profile-modal-actions">
              <button type="button" className="profile-btn profile-btn-light" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="profile-btn profile-btn-primary" disabled={saving}>{saving ? 'Saving…' : '✓ Save Profile'}</button>
            </div>
          </>}
        </form>
      </div>}
    </>
  );
}
