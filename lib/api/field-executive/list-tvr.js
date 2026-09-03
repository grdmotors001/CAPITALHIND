// GET /api/field-executive/list-tvr
// Approved applications assigned to this Field Executive and their TVR status.
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireUserAuth(req, res, ['field_executive']);
  if (!session) return;
  try {
    const s = getSupabase();
    const { data, error } = await s.from('loan_applications').select(`
      id, application_no, loan_account_no, application_status, tvr_status, approved_at,
      customer_profiles ( full_name, phone, address, city, state, pincode ),
      vehicle_model_master ( model_name ),
      dealer_master ( dealer_name ),
      loan_tvrs ( id, assigned_fe_id, status, verification_date, verification_time, recommendation, remarks, verified_at )
    `).eq('assigned_fe_id', session.user_id).eq('application_status', 'approved').order('approved_at', { ascending: false }).limit(100);
    if (error) { console.error('[field-executive/list-tvr]', error.message); return sendError(res, 500, 'Could not load TVR cases.'); }
    const applications = (data || []).map(r => ({
      id:r.id, application_no:r.application_no, loan_account_no:r.loan_account_no, application_status:r.application_status,
      tvr_status:r.tvr_status || 'pending', approved_at:r.approved_at,
      customer_name:r.customer_profiles?.full_name || null, customer_phone:r.customer_profiles?.phone || null,
      customer_address:r.customer_profiles?.address || null, customer_city:r.customer_profiles?.city || null,
      vehicle_model:r.vehicle_model_master?.model_name || null, dealer_name:r.dealer_master?.dealer_name || null,
      tvr:Array.isArray(r.loan_tvrs) ? (r.loan_tvrs[0] || null) : r.loan_tvrs
    }));
    return res.status(200).json({ success:true, applications });
  } catch (e) { console.error('[field-executive/list-tvr] unhandled', e); return sendError(res, 500, 'Could not load TVR cases.'); }
}
