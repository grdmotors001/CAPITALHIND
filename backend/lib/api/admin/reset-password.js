import bcrypt from 'bcryptjs';
import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../../_lib/auth.js';

const TABLES = new Set(['users', 'staff_accounts', 'dealer_users']);
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendError(res, 405, 'Method not allowed'); }
  if (!requireAdminAuth(req, res)) return;
  const { id, table = 'users', new_password } = req.body || {};
  if (!id) return sendError(res, 422, 'Account id is required.');
  if (!TABLES.has(table)) return sendError(res, 422, 'Invalid account type.');
  if (!new_password || String(new_password).length < 8) return sendError(res, 422, 'New password must be at least 8 characters.');
  try {
    const supabase = getSupabase();
    const password_hash = await bcrypt.hash(String(new_password), 10);
    const { data, error } = await supabase.from(table).update({ password_hash }).eq('id', id).select('id').maybeSingle();
    if (error) { console.error('[admin/reset-password]', error.message); return sendError(res, 500, 'Could not reset password.'); }
    if (!data) return sendError(res, 404, 'Account not found.');
    return res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err) { console.error('[admin/reset-password]', err); return sendError(res, 500, 'Could not reset password.'); }
}
