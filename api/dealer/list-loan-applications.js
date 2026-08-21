// GET /api/dealer/list-loan-applications
// Returns loan applications submitted by the logged-in dealer, most recent
// first. Feeds the Dealer Dashboard "Application Status Tracker" block.

import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireDealerAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('loan_applications')
      .select(`
        id, application_no, loan_account_no, application_status,
        loan_amount_requested, tenure_months, submitted_at,
        customer_profiles ( full_name, phone ),
        vehicle_model_master ( model_name )
      `)
      .eq('dealer_id', session.dealer_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[list-loan-applications]', error.message);
      return sendError(res, 500, 'Could not load applications');
    }

    const applications = (data || []).map((row) => ({
      id: row.id,
      application_no: row.application_no,
      loan_account_no: row.loan_account_no,
      application_status: row.application_status,
      loan_amount_requested: row.loan_amount_requested,
      tenure_months: row.tenure_months,
      submitted_at: row.submitted_at,
      customer_name: row.customer_profiles?.full_name ?? null,
      customer_phone: row.customer_profiles?.phone ?? null,
      vehicle_model: row.vehicle_model_master?.model_name ?? null,
    }));

    res.status(200).json({ success: true, applications });
  } catch (err) {
    console.error('[list-loan-applications] unhandled', err);
    return sendError(res, 500, 'Could not load applications');
  }
}
