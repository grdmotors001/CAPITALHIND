// POST /api/admin/delete-user
//
// Removes an account from the `users` table. Admin-only (JWT). An admin
// can't delete their own currently-logged-in account.
// Body: { id }

import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { id } = req.body || {};
    if (!id) return sendError(res, 422, 'id is required');

    if (id === session.user_id) {
      return sendError(res, 400, "You can't remove your own logged-in account.");
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) {
      console.error('[admin/delete-user]', error.message);
      return sendError(res, 500, 'Failed to remove account.');
    }

    return res.status(200).json({ success: true, message: 'Account removed.' });
  } catch (err) {
    console.error('[admin/delete-user] unhandled', err);
    return sendError(res, 500, 'Failed to remove account.');
  }
}
