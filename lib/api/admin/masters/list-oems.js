// GET /api/admin/masters/list-oems
// Lists vehicle OEMs (used to populate the OEM dropdown on the Vehicle
// Model master form). Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('vehicle_oem_master')
      .select('id, oem_name, is_active')
      .order('oem_name', { ascending: true });

    if (error) {
      console.error('[admin/masters/list-oems]', error.message);
      return sendError(res, 500, 'Failed to load OEM master.');
    }

    return res.status(200).json({ success: true, items: data || [] });
  } catch (err) {
    console.error('[admin/masters/list-oems] unhandled', err);
    return sendError(res, 500, 'Failed to load OEM master.');
  }
}
