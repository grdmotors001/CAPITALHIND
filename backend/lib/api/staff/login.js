// POST /api/staff/login — login for staff_accounts (staff/cashier).
import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { signToken, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const { identifier, password } = req.body || {};
    const key = String(identifier || '').trim();
    if (!key || !password) return sendError(res, 422, 'Username/mobile and password are required');
    const supabase = getSupabase();
    const { data: rows, error } = await supabase.from('staff_accounts')
      .select('id, username, contact_mobile, email, password_hash, role, is_active')
      .eq('is_active', true)
      .or(`username.ilike.${key},contact_mobile.eq.${key},email.ilike.${key}`)
      .limit(2);
    if (error) { console.error('[staff/login]', error.message); return sendError(res, 500, 'Login failed. Please try again.'); }
    if (!rows?.length) return sendError(res, 401, 'Invalid credentials');
    if (rows.length > 1) return sendError(res, 401, 'Multiple accounts match this login. Use username.');
    const user = rows[0];
    if (!(await bcrypt.compare(String(password), user.password_hash))) return sendError(res, 401, 'Invalid credentials');
    const token = signToken({ type: 'staff_user', staff_user_id: user.id, role: user.role });
    return res.status(200).json({ success: true, token, role: user.role, user: { id: user.id, full_name: user.username, phone: user.contact_mobile, email: user.email, role: user.role } });
  } catch (err) {
    console.error('[staff/login] unhandled', err);
    return sendError(res, 500, 'Login failed. Please try again.');
  }
}
