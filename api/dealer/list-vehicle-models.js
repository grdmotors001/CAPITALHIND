// GET /api/dealer/list-vehicle-models
// Returns vehicle models mapped to the logged-in dealer, joined with
// vehicle_model_master. Used to populate the Step 2 dropdown.

import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireDealerAuth(req, res);
  if (!session) return;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('dealer_vehicle_mapping')
    .select('vehicle_model_master(id, model_name, vehicle_type, ex_showroom_price, battery_capacity)')
    .eq('dealer_id', session.dealer_id)
    .eq('is_active', true)
    .eq('vehicle_model_master.is_active', true);

  if (error) {
    console.error('[list-vehicle-models]', error.message);
    return sendError(res, 500, 'Could not load vehicle models');
  }

  const models = (data || [])
    .map((row) => row.vehicle_model_master)
    .filter(Boolean)
    .sort((a, b) => a.model_name.localeCompare(b.model_name));

  res.status(200).json({ success: true, models });
}
