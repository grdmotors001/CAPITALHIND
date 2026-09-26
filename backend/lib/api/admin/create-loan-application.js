// POST /api/admin/create-loan-application
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';
import { resolveGrdDealer } from '../_lib/grd.js';
import { validateCustomer, validateVehicleLoan, validateGuarantors, generateApplicationNo } from '../_lib/validate.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;
  const { dealer = {}, customer = {}, vehicleLoan = {}, guarantors = [] } = req.body || {};
  const errors = [...validateCustomer(customer), ...validateVehicleLoan(vehicleLoan), ...validateGuarantors(guarantors)];
  if (!dealer.id) errors.unshift('Dealer select karein');
  if (errors.length) return res.status(422).json({ success: false, errors });
  let customerId = null;
  let applicationId = null;
  let supabase;
  try {
    supabase = getSupabase();
    const dealerRow = await resolveGrdDealer(supabase, dealer.id);
    const aadhaarMasked = 'XXXX-XXXX-' + String(customer.aadhaar).slice(-4);
    const { data: customerRow, error: customerErr } = await supabase.from('customer_profiles').insert({
      full_name: customer.full_name, phone: customer.phone, email: customer.email ?? null, dob: customer.dob,
      gender: customer.gender ?? null, address: customer.address, city: customer.city ?? null, state: customer.state ?? null,
      pincode: customer.pincode, pan: customer.pan, aadhaar_masked: aadhaarMasked, occupation: customer.occupation ?? null,
      monthly_income: customer.monthly_income ?? null, created_by_dealer_id: dealerRow.id,
    }).select('id').single();
    if (customerErr) throw customerErr;
    customerId = customerRow.id;
    const { data: dealerUser, error: dealerUserErr } = await supabase.from('dealer_users').select('id').eq('dealer_id', dealerRow.id).eq('is_active', true).order('id', { ascending: true }).limit(1).maybeSingle();
    if (dealerUserErr) throw dealerUserErr;
    if (!dealerUser?.id) throw new Error('Selected dealer has no active dealer user.');
    const applicationNo = await generateApplicationNo(supabase);
    const { data: appRow, error: appErr } = await supabase.from('loan_applications').insert({
      application_no: applicationNo, dealer_id: dealerRow.id, dealer_user_id: dealerUser.id, customer_id: customerId,
      vehicle_model_id: vehicleLoan.vehicle_model_id, vehicle_price: vehicleLoan.vehicle_price,
      down_payment: vehicleLoan.down_payment, loan_amount_requested: vehicleLoan.loan_amount_requested,
      tenure_months: vehicleLoan.tenure_months,
      physical_register_serial_no: String(vehicleLoan.physical_register_serial_no || '').trim() || null,
      application_status: 'submitted', submitted_at: new Date().toISOString(),
    }).select('id').single();
    if (appErr) throw appErr;
    applicationId = appRow.id;
    const guarantorRows = guarantors.map((g) => ({
      loan_application_id: applicationId, full_name: g.full_name,
      relation_with_customer: g.relation_with_customer ?? null, phone: g.phone, address: g.address ?? null,
      pan: g.pan ?? null, aadhaar_masked: g.aadhaar ? 'XXXX-XXXX-' + String(g.aadhaar).slice(-4) : null,
    }));
    const { error: guarantorErr } = await supabase.from('guarantor_details').insert(guarantorRows);
    if (guarantorErr) throw guarantorErr;
    const { error: historyErr } = await supabase.from('application_status_history').insert({
      loan_application_id: applicationId, from_status: 'draft', to_status: 'submitted',
      changed_by: session.user_id, changed_by_type: 'admin',
      remarks: 'Application entered by CHFPL Admin on behalf of dealer: ' + dealerRow.dealer_name,
    });
    if (historyErr) throw historyErr;
    return res.status(200).json({ success: true, application_id: applicationId, application_no: applicationNo,
      customer_id: customerId, dealer_id: dealerRow.id, dealer_name: dealerRow.dealer_name, status: 'submitted' });
  } catch (e) {
    console.error('[admin/create-loan-application]', e.message || e);
    if (applicationId) {
      await supabase.from('guarantor_details').delete().eq('loan_application_id', applicationId);
      await supabase.from('application_status_history').delete().eq('loan_application_id', applicationId);
      await supabase.from('loan_applications').delete().eq('id', applicationId);
    }
    if (customerId) await supabase.from('customer_profiles').delete().eq('id', customerId);
    return sendError(res, 500, 'Could not save application. Please try again.');
  }
}