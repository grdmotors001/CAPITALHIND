// POST /api/admin/staff/delete
// Removes a staff account. Current admin accounts are handled by users API.
import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { id } = req.body || {};
    if (!id) return sendError(res, 422, 'id is required.');

    const supabase = getSupabase();
    const { error } = await supabase.from('staff_accounts').delete().eq('id', id);
    if (error) {
      console.error('[admin/staff/delete]', error.message);
      return sendError(res, 500, 'Failed to remove staff account.');
    }

    return res.status(200).json({ success: true, message: 'Staff account removed.' });
  } catch (err) {
    console.error('[admin/staff/delete] unhandled', err);
    return sendError(res, 500, 'Failed to remove staff account.');
  }
}
