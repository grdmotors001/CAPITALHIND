// GET /api/admin/masters/list-vehicle-models
// Lists Vehicle Model master records (joined with OEM). Admin-only (JWT).
// Note: this is the admin management view over the same `vehicle_model_master`
// table used by src/apps/dealer/api.js (api/dealer/list-vehicle-models.js) to
// populate the dealer's Step 2 dropdown.

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('vehicle_model_master')
      .select('id, model_name, vehicle_type, ex_showroom_price, battery_capacity, is_active, created_at, oem_id, vehicle_oem_master(id, oem_name)')
      .order('model_name', { ascending: true });

    if (error) {
      console.error('[admin/masters/list-vehicle-models]', error.message);
      return sendError(res, 500, 'Failed to load vehicle model master.');
    }

    const items = (data || []).map(({ vehicle_oem_master, ...row }) => ({
      ...row,
      oem_name: vehicle_oem_master?.oem_name || null,
    }));

    return res.status(200).json({ success: true, items });
  } catch (err) {
    console.error('[admin/masters/list-vehicle-models] unhandled', err);
    return sendError(res, 500, 'Failed to load vehicle model master.');
  }
}
