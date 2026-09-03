// GET /api/admin/list-users
//
// Lists accounts from the `users` table (field_executive / tele_caller /
// customer / admin) — the same table used for login/RoleGuard everywhere
// else in the app. Admin-only (JWT).

import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, phone, email, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin/list-users]', error.message);
      return sendError(res, 500, 'Failed to load users.');
    }

    return res.status(200).json({
      success: true,
      users: (users || []).map((u) => ({
        ...u,
        is_current: u.id === session.user_id,
      })),
    });
  } catch (err) {
    console.error('[admin/list-users] unhandled', err);
    return sendError(res, 500, 'Failed to load users.');
  }
}
