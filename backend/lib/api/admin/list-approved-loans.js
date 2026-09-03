// GET /api/admin/list-approved-loans
// Returns approved applications that are ready to be converted into loan accounts.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('loan_applications')
      .select(`
        id, application_no, loan_account_no, application_status,
        loan_amount_requested, tenure_months, vehicle_price, down_payment,
        submitted_at, created_at, physical_register_serial_no, approval_valid_until, approved_at, tvr_status,
        customer_profiles ( full_name, phone, email, address, city, state, pincode, pan, occupation, monthly_income ),
        vehicle_model_master ( model_name ),
        dealer_master ( dealer_name )
      `)
      .eq('application_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[admin/list-approved-loans]', error.message);
      return sendError(res, 500, 'Could not load approved loans.');
    }

    const applications = (data || []).map((row) => ({
      id: row.id,
      application_no: row.application_no,
      loan_account_no: row.loan_account_no,
      application_status: row.application_status,
      loan_amount_requested: row.loan_amount_requested,
      tenure_months: row.tenure_months,
      vehicle_price: row.vehicle_price,
      down_payment: row.down_payment,
      submitted_at: row.submitted_at,
      created_at: row.created_at,
      physical_register_serial_no: row.physical_register_serial_no,
      approval_valid_until: row.approval_valid_until,
      approved_at: row.approved_at, tvr_status,
      customer: row.customer_profiles || null,
      vehicle_model: row.vehicle_model_master?.model_name || null,
      dealer_name: row.dealer_master?.dealer_name || null,
    }));

    return res.status(200).json({ success: true, applications });
  } catch (err) {
    console.error('[admin/list-approved-loans] unhandled', err);
    return sendError(res, 500, 'Could not load approved loans.');
  }
}
