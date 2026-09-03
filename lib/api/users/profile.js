// GET/PATCH /api/users/profile
// Universal self-service profile for admin/staff/customer users and dealer users.
import jwt from 'jsonwebtoken';
import { getSupabase } from '../_lib/supabase.js';
import { sendError, methodGuard } from '../_lib/auth.js';

const JWT_SECRET = process.env.JWT_SECRET;
const USER_ROLES = ['field_executive', 'tele_caller', 'customer', 'do', 'team_leader', 'admin'];

function getSession(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) { sendError(res, 401, 'Not logged in. Please login again.'); return null; }
  if (!JWT_SECRET) { sendError(res, 500, 'JWT_SECRET env var is not set'); return null; }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === 'admin_user' && decoded.role === 'admin' && decoded.user_id) return decoded;
    if (decoded.type === 'app_user' && decoded.user_id && USER_ROLES.includes(decoded.role)) return decoded;
    if (decoded.type === 'dealer_user' && decoded.dealer_id && decoded.dealer_user_id) return decoded;
    if (decoded.type === 'staff_user' && decoded.staff_user_id && ['staff','cashier'].includes(decoded.role)) return decoded;
    sendError(res, 401, 'Invalid session. Please login again.');
    return null;
  } catch {
    sendError(res, 401, 'Session expired. Please login again.');
    return null;
  }
}

const fields = 'id, full_name, phone, email, role, dob, father_name, address, profile_photo, is_active';
const dealerFields = 'id, dealer_id, full_name, phone, email, role, dob, father_name, address, profile_photo, is_active';
const staffFields = 'id, username, contact_mobile, email, role, dob, father_name, address, profile_photo, is_active';

function cleanBody(body = {}) {
  const full_name = String(body.full_name || '').trim();
  const phone = String(body.phone || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const father_name = String(body.father_name || '').trim();
  const address = String(body.address || '').trim();
  const dob = body.dob ? String(body.dob).trim() : null;
  const profile_photo = body.profile_photo ? String(body.profile_photo) : null;

  if (!full_name) throw new Error('Name is required');
  if (!phone || !/^[0-9]{7,15}$/.test(phone)) throw new Error('Valid mobile number is required');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email');
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new Error('Invalid DOB');
  if (profile_photo && (!profile_photo.startsWith('data:image/') || profile_photo.length > 1600000)) {
    throw new Error('Profile photo is too large. Please choose a smaller photo.');
  }
  return { full_name, phone, email: email || null, father_name: father_name || null, address: address || null, dob: dob || null, profile_photo: profile_photo || null };
}

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PATCH');
    return sendError(res, 405, 'Method not allowed');
  }
  const session = getSession(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();
      const isDealer = session.type === 'dealer_user';
    const isStaff = session.type === 'staff_user';
    const id = isDealer ? session.dealer_user_id : (isStaff ? session.staff_user_id : session.user_id);
    const table = isDealer ? 'dealer_users' : (isStaff ? 'staff_accounts' : 'users');

    if (req.method === 'GET') {
      const { data: raw, error } = await supabase.from(table).select(isDealer ? dealerFields : (isStaff ? staffFields : fields)).eq('id', id).maybeSingle();
      const data = isStaff && raw ? { ...raw, full_name: raw.username, phone: raw.contact_mobile } : raw;
      if (error) { console.error('[users/profile GET]', error.message); return sendError(res, 500, 'Could not load profile'); }
      if (!data) return sendError(res, 404, 'Profile not found');
      return res.status(200).json({ success: true, profile: data });
    }

    let payload;
    try { payload = cleanBody(req.body || {}); }
    catch (e) { return sendError(res, 422, e.message); }

    // Prevent duplicate mobile numbers. The DB unique constraint is the final guard.
    const { data: duplicate } = await supabase.from(table).select('id').eq(isStaff ? 'contact_mobile' : 'phone', payload.phone).neq('id', id).limit(1).maybeSingle();
    if (duplicate) return sendError(res, 409, 'This mobile number is already registered.');

    const updatePayload = isStaff ? { username: payload.full_name, contact_mobile: payload.phone, email: payload.email, dob: payload.dob, father_name: payload.father_name, address: payload.address, profile_photo: payload.profile_photo } : payload;
    const { data: rawUpdated, error } = await supabase.from(table).update(updatePayload).eq('id', id).select(isDealer ? dealerFields : (isStaff ? staffFields : fields)).maybeSingle();
    const data = isStaff && rawUpdated ? { ...rawUpdated, full_name: rawUpdated.username, phone: rawUpdated.contact_mobile } : rawUpdated;
    if (error) {
      console.error('[users/profile PATCH]', error.message);
      return sendError(res, 500, 'Could not update profile');
    }
    if (!data) return sendError(res, 404, 'Profile not found');

    // Customer loan matching historically uses customer_profiles.phone. Keep it in sync
    // when a customer changes their mobile number from the profile screen.
    if (!isDealer && session.role === 'customer' && payload.phone) {
      const oldPhone = req.body?.current_phone ? String(req.body.current_phone).trim() : null;
      if (oldPhone && oldPhone !== payload.phone) {
        await supabase.from('customer_profiles').update({ phone: payload.phone }).eq('phone', oldPhone);
      }
    }

    return res.status(200).json({ success: true, profile: data });
  } catch (err) {
    console.error('[users/profile] unhandled', err);
    return sendError(res, 500, 'Could not process profile request');
  }
}
