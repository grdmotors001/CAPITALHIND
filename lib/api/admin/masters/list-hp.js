// GET /api/admin/masters/list-hp
// Lists Hypothecation (HP) master records. Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('hypothecation_master')
      .select('id, hp_name, hp_code, city, state, is_active, created_at')
      .order('hp_name', { ascending: true });

    if (error) {
      console.error('[admin/masters/list-hp]', error.message);
      return sendError(res, 500, 'Failed to load HP master.');
    }

    return res.status(200).json({ success: true, items: data || [] });
  } catch (err) {
    console.error('[admin/masters/list-hp] unhandled', err);
    return sendError(res, 500, 'Failed to load HP master.');
  }
}
