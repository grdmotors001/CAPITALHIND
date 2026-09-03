import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { sendError } from '../_lib/auth.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

function session(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) { sendError(res, 401, 'Not logged in. Please login again.'); return null; }
  try {
    const d = jwt.verify(token, JWT_SECRET);
    if (d.type === 'admin_user' && d.role === 'admin' && d.user_id) return { ...d, table: 'users', id: d.user_id };
    if (d.type === 'app_user' && d.user_id) return { ...d, table: 'users', id: d.user_id };
    if (d.type === 'dealer_user' && d.dealer_user_id) return { ...d, table: 'dealer_users', id: d.dealer_user_id };
    if (d.type === 'staff_user' && d.staff_user_id) return { ...d, table: 'staff_accounts', id: d.staff_user_id };
    sendError(res, 401, 'Invalid session. Please login again.'); return null;
  } catch { sendError(res, 401, 'Session expired. Please login again.'); return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendError(res, 405, 'Method not allowed'); }
  const s = session(req, res); if (!s) return;
  const current_password = String(req.body?.current_password || '');
  const new_password = String(req.body?.new_password || '');
  if (!current_password) return sendError(res, 422, 'Current password is required.');
  if (new_password.length < 8) return sendError(res, 422, 'New password must be at least 8 characters.');
  if (current_password === new_password) return sendError(res, 422, 'New password must be different from current password.');
  try {
    const supabase = getSupabase();
    const { data: account, error } = await supabase.from(s.table).select('id,password_hash').eq('id', s.id).maybeSingle();
    if (error) { console.error('[users/change-password] lookup', error.message); return sendError(res, 500, 'Could not load account.'); }
    if (!account) return sendError(res, 404, 'Account not found.');
    const ok = await bcrypt.compare(current_password, account.password_hash || '');
    if (!ok) return sendError(res, 401, 'Current password is incorrect.');
    const password_hash = await bcrypt.hash(new_password, 10);
    const { error: updateError } = await supabase.from(s.table).update({ password_hash }).eq('id', s.id);
    if (updateError) { console.error('[users/change-password] update', updateError.message); return sendError(res, 500, 'Could not change password.'); }
    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) { console.error('[users/change-password]', err); return sendError(res, 500, 'Could not change password.'); }
}
