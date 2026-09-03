// GET/PATCH /api/dealer/profile
// Dealer self-service profile. Only the authenticated dealer user can update
// their own display name; dealer/company identity fields stay read-only.
import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendError } from '../_lib/auth.js';

export default async function handler(req, res) {
  const session = requireDealerAuth(req, res);
  if (!session) return;

  const supabase = getSupabase();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('dealer_users')
        .select('id, dealer_id, full_name, phone, role, is_active')
        .eq('id', session.dealer_user_id)
        .eq('dealer_id', session.dealer_id)
        .maybeSingle();

      if (error) return sendError(res, 500, 'Could not load profile');
      if (!data) return sendError(res, 404, 'Dealer profile not found');

      return res.status(200).json({ success: true, profile: data });
    }

    if (req.method === 'PATCH') {
      const full_name = String(req.body?.full_name || '').trim();
      if (!full_name) return sendError(res, 422, 'Full name is required');
      if (full_name.length > 100) return sendError(res, 422, 'Full name is too long');

      const { data, error } = await supabase
        .from('dealer_users')
        .update({ full_name })
        .eq('id', session.dealer_user_id)
        .eq('dealer_id', session.dealer_id)
        .select('id, dealer_id, full_name, phone, role, is_active')
        .maybeSingle();

      if (error) {
        console.error('[dealer/profile PATCH]', error.message);
        return sendError(res, 500, 'Could not update profile');
      }
      if (!data) return sendError(res, 404, 'Dealer profile not found');

      return res.status(200).json({ success: true, profile: data });
    }

    res.setHeader('Allow', 'GET, PATCH');
    return sendError(res, 405, 'Method not allowed');
  } catch (err) {
    console.error('[dealer/profile] unhandled', err);
    return sendError(res, 500, 'Could not process profile request');
  }
}
