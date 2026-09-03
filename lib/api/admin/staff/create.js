// POST /api/admin/staff/create
// Creates a staff account in the dedicated staff_accounts table.
import bcrypt from 'bcryptjs';
import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { username, password, contact_mobile, email, role = 'staff' } = req.body || {};
    const name = String(username || '').trim();
    const mobile = String(contact_mobile || '').trim();
    const mail = String(email || '').trim().toLowerCase();
    const staffRole = String(role || 'staff').trim();
    if (!['staff','cashier'].includes(staffRole)) return sendError(res, 422, 'Invalid staff role.');

    if (!name) return sendError(res, 422, 'Username is required.');
    if (name.length > 100) return sendError(res, 422, 'Username is too long.');
    if (!password || String(password).length < 8) return sendError(res, 422, 'Password must be at least 8 characters.');
    if (mobile && !/^\d{10}$/.test(mobile)) return sendError(res, 422, 'Mobile must be a valid 10-digit number.');
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return sendError(res, 422, 'Email is invalid.');

    const supabase = getSupabase();
    const password_hash = await bcrypt.hash(String(password), 10);
    const { data, error } = await supabase.from('staff_accounts').insert({
      username: name,
      password_hash,
      contact_mobile: mobile || null,
      email: mail || null,
      role: staffRole,
      is_active: true,
      created_by: session.user_id,
    }).select('id, username, contact_mobile, email, role, is_active, created_at').single();

    if (error) {
      console.error('[admin/staff/create]', error.message);
      if (error.code === '23505') return sendError(res, 409, 'A staff account with this username, mobile or email already exists.');
      return sendError(res, 500, 'Failed to create staff account.');
    }

    return res.status(200).json({ success: true, message: 'Staff account created successfully.', user: data });
  } catch (err) {
    console.error('[admin/staff/create] unhandled', err);
    return sendError(res, 500, 'Failed to create staff account.');
  }
}
