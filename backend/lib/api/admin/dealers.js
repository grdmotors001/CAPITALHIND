// GET /api/admin/dealers
// GRD is the source of truth. If the GRD bridge is temporarily unavailable,
// use the existing CHFPL dealer mirror so admin loan entry remains usable.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../_lib/auth.js';
import { fetchGrdMasters, mapGrdDealers } from '../_lib/grd.js';

export default async function handler(req, res) {
  const session = requireAdminAuth(req, res);
  if (!session) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendError(res, 405, 'Dealer master is maintained in GRD.');
  }
  try {
    const data = await fetchGrdMasters();
    return res.status(200).json({ success: true, dealers: mapGrdDealers(data), source: 'grd' });
  } catch (err) {
    console.error('[admin/dealers GRD]', err.message || err);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('dealer_master')
        .select('id,dealer_name,dealer_code,grd_dealer_id,is_active')
        .eq('is_active', true)
        .order('dealer_name', { ascending: true });
      if (error) throw error;
      const dealers = (data || []).map(d => ({
        id: d.grd_dealer_id || d.id,
        grd_dealer_id: d.grd_dealer_id || d.id,
        dealer_code: d.dealer_code || '',
        dealer_name: d.dealer_name || '',
        source: 'chfpl-mirror',
        users: [],
      }));
      return res.status(200).json({ success: true, dealers, source: 'chfpl-mirror', warning: 'GRD bridge unavailable; using CHFPL dealer mirror.' });
    } catch (fallbackErr) {
      console.error('[admin/dealers fallback]', fallbackErr.message || fallbackErr);
      return sendError(res, 502, 'Could not load dealers from GRD or CHFPL mirror.');
    }
  }
}
