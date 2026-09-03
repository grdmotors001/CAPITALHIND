// POST /api/admin/masters/delete-hp
// Body: { id }
// Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { id } = req.body || {};
    if (!id) return sendError(res, 422, 'id is required');

    const supabase = getSupabase();
    const { error } = await supabase.from('hypothecation_master').delete().eq('id', id);

    if (error) {
      console.error('[admin/masters/delete-hp]', error.message);
      if (error.code === '23503') {
        return sendError(res, 409, 'This HP record is used by existing loan applications and cannot be deleted. Mark it inactive instead.');
      }
      return sendError(res, 500, 'Failed to remove HP record.');
    }

    return res.status(200).json({ success: true, message: 'HP record removed.' });
  } catch (err) {
    console.error('[admin/masters/delete-hp] unhandled', err);
    return sendError(res, 500, 'Failed to remove HP record.');
  }
}
