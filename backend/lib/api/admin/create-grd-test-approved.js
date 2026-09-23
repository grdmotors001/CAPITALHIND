import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('loan_applications')
      .select('id, application_no, application_status, dealer_id, dealer_user_id, customer_id, vehicle_model_id')
      .like('application_no', 'GRD-TEST-%')
      .in('application_status', ['approved', 'sanctioned', 'disbursed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        success: true,
        existing: true,
        message: `GRD test approved application already exists: ${existing.application_no}`,
        application: existing,
      });
    }

    const { data: dealer, error: dealerErr } = await supabase
      .from('dealer_master')
      .select('id, dealer_name, dealer_code')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (dealerErr || !dealer) return sendError(res, 422, 'No active dealer found. Create a dealer first.');

    const { data: dealerUser, error: dealerUserErr } = await supabase
      .from('dealer_users')
      .select('id, full_name, phone')
      .eq('dealer_id', dealer.id)
      .eq('is_active', true)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (dealerUserErr || !dealerUser) return sendError(res, 422, 'No active dealer user found for the first active dealer.');

    const { data: model, error: modelErr } = await supabase
      .from('vehicle_model_master')
      .select('id, model_name, ex_showroom_price')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (modelErr || !model) return sendError(res, 422, 'No active vehicle model found.');

    const stamp = Date.now();
    const applicationNo = `GRD-TEST-${stamp}`;
    const phone = String(9000000000 + (stamp % 999999999)).slice(-10);
    const vehiclePrice = Number(model.ex_showroom_price || 100000);
    const downPayment = Math.round(vehiclePrice * 0.2);
    const loanAmount = vehiclePrice - downPayment;
    const approvalValidUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const { data: customer, error: customerErr } = await supabase
      .from('customer_profiles')
      .insert({
        full_name: 'GRD TEST CUSTOMER',
        phone,
        dob: '1990-01-01',
        address: 'GRD Integration Test Address',
        city: dealer.city || 'New Delhi',
        state: dealer.state || 'Delhi',
        pincode: '110001',
        pan: 'GRDTEST' + String(stamp).slice(-4),
        aadhaar_masked: 'XXXX-XXXX-1234',
        occupation: 'GRD Integration Test',
        monthly_income: 50000,
        created_by_dealer_id: dealer.id,
      })
      .select('id')
      .single();
    if (customerErr) return sendError(res, 500, 'Could not create GRD test customer.');

    const { data: application, error: appErr } = await supabase
      .from('loan_applications')
      .insert({
        application_no: applicationNo,
        dealer_id: dealer.id,
        dealer_user_id: dealerUser.id,
        customer_id: customer.id,
        vehicle_model_id: model.id,
        vehicle_price: vehiclePrice,
        down_payment: downPayment,
        loan_amount_requested: loanAmount,
        tenure_months: 36,
        application_status: 'approved',
        submitted_at: new Date().toISOString(),
        cibil_score: 750,
        cibil_checked_at: new Date().toISOString(),
        approval_valid_until: approvalValidUntil,
        approved_at: new Date().toISOString(),
        tvr_status: 'verified',
      })
      .select('id, application_no, application_status, dealer_id, dealer_user_id, customer_id, vehicle_model_id, loan_amount_requested, approval_valid_until')
      .single();

    if (appErr) {
      console.error('[admin/create-grd-test-approved] application', appErr.message);
      return sendError(res, 500, 'Could not create GRD test approved application.');
    }

    await supabase.from('application_status_history').insert({
      loan_application_id: application.id,
      from_status: null,
      to_status: 'approved',
      changed_by: session.user_id,
      changed_by_type: 'admin',
      remarks: 'GRD integration test approved application created by admin.',
    });

    return res.status(201).json({
      success: true,
      message: `GRD test approved application created: ${applicationNo}`,
      application,
      dealer: { id: dealer.id, name: dealer.dealer_name, code: dealer.dealer_code },
      dealer_user: { id: dealerUser.id, name: dealerUser.full_name },
      vehicle_model: model.model_name,
    });
  } catch (err) {
    console.error('[admin/create-grd-test-approved] unhandled', err);
    return sendError(res, 500, 'Could not create GRD test approved application.');
  }
}
