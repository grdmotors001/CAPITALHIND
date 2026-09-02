// POST /api/admin/masters/create-vehicle-model
// Body: { model_name, vehicle_type, ex_showroom_price, oem_id?, battery_capacity? }
// Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

const VEHICLE_TYPES = ['2W', '3W', '4W'];

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { model_name, vehicle_type, ex_showroom_price, oem_id, battery_capacity } = req.body || {};

    const errors = [];
    if (!model_name || !String(model_name).trim()) errors.push('model_name is required');
    if (!vehicle_type || !VEHICLE_TYPES.includes(vehicle_type)) {
      errors.push(`vehicle_type must be one of: ${VEHICLE_TYPES.join(', ')}`);
    }
    if (ex_showroom_price === undefined || ex_showroom_price === null || Number.isNaN(Number(ex_showroom_price))) {
      errors.push('ex_showroom_price is required');
    }
    if (errors.length) {
      return res.status(422).json({ success: false, error: errors.join(', ') });
    }

    const supabase = getSupabase();

    const { data: item, error } = await supabase
      .from('vehicle_model_master')
      .insert({
        model_name: model_name.trim(),
        vehicle_type,
        ex_showroom_price: Number(ex_showroom_price),
        oem_id: oem_id || null,
        battery_capacity: battery_capacity || null,
        is_active: true,
      })
      .select('id, model_name, vehicle_type, ex_showroom_price, battery_capacity, is_active, created_at, oem_id')
      .single();

    if (error) {
      console.error('[admin/masters/create-vehicle-model]', error.message);
      if (error.code === '23505') {
        return sendError(res, 409, 'A vehicle model with this name already exists.');
      }
      return sendError(res, 500, 'Failed to create vehicle model.');
    }

    return res.status(200).json({ success: true, message: 'Vehicle model created.', item });
  } catch (err) {
    console.error('[admin/masters/create-vehicle-model] unhandled', err);
    return sendError(res, 500, 'Failed to create vehicle model.');
  }
}
