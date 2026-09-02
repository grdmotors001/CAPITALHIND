// POST /api/admin/masters/update-vehicle-model
// Body: { id, model_name?, vehicle_type?, ex_showroom_price?, oem_id?, battery_capacity?, is_active? }
// Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

const VEHICLE_TYPES = ['2W', '3W', '4W'];

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { id, model_name, vehicle_type, ex_showroom_price, oem_id, battery_capacity, is_active } = req.body || {};
    if (!id) return sendError(res, 422, 'id is required');

    const patch = {};
    if (model_name !== undefined) {
      if (!String(model_name).trim()) return sendError(res, 422, 'model_name cannot be empty');
      patch.model_name = model_name.trim();
    }
    if (vehicle_type !== undefined) {
      if (!VEHICLE_TYPES.includes(vehicle_type)) {
        return sendError(res, 422, `vehicle_type must be one of: ${VEHICLE_TYPES.join(', ')}`);
      }
      patch.vehicle_type = vehicle_type;
    }
    if (ex_showroom_price !== undefined) {
      if (Number.isNaN(Number(ex_showroom_price))) return sendError(res, 422, 'ex_showroom_price is invalid');
      patch.ex_showroom_price = Number(ex_showroom_price);
    }
    if (oem_id !== undefined) patch.oem_id = oem_id || null;
    if (battery_capacity !== undefined) patch.battery_capacity = battery_capacity || null;
    if (is_active !== undefined) patch.is_active = !!is_active;

    const supabase = getSupabase();
    const { data: item, error } = await supabase
      .from('vehicle_model_master')
      .update(patch)
      .eq('id', id)
      .select('id, model_name, vehicle_type, ex_showroom_price, battery_capacity, is_active, created_at, oem_id')
      .single();

    if (error) {
      console.error('[admin/masters/update-vehicle-model]', error.message);
      if (error.code === '23505') {
        return sendError(res, 409, 'A vehicle model with this name already exists.');
      }
      return sendError(res, 500, 'Failed to update vehicle model.');
    }

    return res.status(200).json({ success: true, message: 'Vehicle model updated.', item });
  } catch (err) {
    console.error('[admin/masters/update-vehicle-model] unhandled', err);
    return sendError(res, 500, 'Failed to update vehicle model.');
  }
}
