// POST /api/admin/masters/delete-vehicle-model
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
    const { error } = await supabase.from('vehicle_model_master').delete().eq('id', id);

    if (error) {
      console.error('[admin/masters/delete-vehicle-model]', error.message);
      if (error.code === '23503') {
        return sendError(res, 409, 'This vehicle model is used by dealer mappings or loan applications and cannot be deleted. Mark it inactive instead.');
      }
      return sendError(res, 500, 'Failed to remove vehicle model.');
    }

    return res.status(200).json({ success: true, message: 'Vehicle model removed.' });
  } catch (err) {
    console.error('[admin/masters/delete-vehicle-model] unhandled', err);
    return sendError(res, 500, 'Failed to remove vehicle model.');
  }
}
