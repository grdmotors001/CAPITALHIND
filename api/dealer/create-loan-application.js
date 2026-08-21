// POST /api/dealer/create-loan-application
//
// Body (JSON):
// {
//   "customer": { full_name, phone, email, dob, gender, address, city, state,
//                 pincode, pan, aadhaar, occupation, monthly_income },
//   "vehicleLoan": { vehicle_model_id, vehicle_price, down_payment,
//                     loan_amount_requested, tenure_months },
//   "guarantors": [ { full_name, relation_with_customer, phone, address, pan, aadhaar } ]
// }
//
// Creates rows in: customer_profiles, loan_applications (status='submitted'),
// guarantor_details, application_status_history. Direct port of the original
// create_loan_application.php, using a Postgres RPC-free manual transaction
// (Supabase JS has no client-side multi-statement transactions, so we do the
// writes in order and roll back manually on failure).

import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendError, methodGuard } from '../_lib/auth.js';
import { validateCustomer, validateVehicleLoan, validateGuarantors, generateApplicationNo } from '../_lib/validate.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireDealerAuth(req, res);
  if (!session) return;

  const { customer = {}, vehicleLoan = {}, guarantors = [] } = req.body || {};

  const errors = [
    ...validateCustomer(customer),
    ...validateVehicleLoan(vehicleLoan),
    ...validateGuarantors(guarantors),
  ];
  if (errors.length) {
    return res.status(422).json({ success: false, errors });
  }

  const supabase = getSupabase();
  let customerId = null;
  let applicationId = null;

  try {
    // 1. customer_profiles
    const aadhaarMasked = `XXXX-XXXX-${String(customer.aadhaar).slice(-4)}`;
    const { data: customerRow, error: customerErr } = await supabase
      .from('customer_profiles')
      .insert({
        full_name: customer.full_name,
        phone: customer.phone,
        email: customer.email ?? null,
        dob: customer.dob,
        gender: customer.gender ?? null,
        address: customer.address,
        city: customer.city ?? null,
        state: customer.state ?? null,
        pincode: customer.pincode,
        pan: customer.pan,
        aadhaar_masked: aadhaarMasked,
        occupation: customer.occupation ?? null,
        monthly_income: customer.monthly_income ?? null,
        created_by_dealer_id: session.dealer_id,
      })
      .select('id')
      .single();
    if (customerErr) throw customerErr;
    customerId = customerRow.id;

    // 2. loan_applications
    const applicationNo = await generateApplicationNo(supabase);
    const { data: appRow, error: appErr } = await supabase
      .from('loan_applications')
      .insert({
        application_no: applicationNo,
        dealer_id: session.dealer_id,
        dealer_user_id: session.dealer_user_id,
        customer_id: customerId,
        vehicle_model_id: vehicleLoan.vehicle_model_id,
        vehicle_price: vehicleLoan.vehicle_price,
        down_payment: vehicleLoan.down_payment,
        loan_amount_requested: vehicleLoan.loan_amount_requested,
        tenure_months: vehicleLoan.tenure_months,
        application_status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (appErr) throw appErr;
    applicationId = appRow.id;

    // 3. guarantor_details (one row per guarantor)
    const guarantorRows = guarantors.map((g) => ({
      loan_application_id: applicationId,
      full_name: g.full_name,
      relation_with_customer: g.relation_with_customer ?? null,
      phone: g.phone,
      address: g.address ?? null,
      pan: g.pan ?? null,
      aadhaar_masked: g.aadhaar ? `XXXX-XXXX-${String(g.aadhaar).slice(-4)}` : null,
    }));
    const { error: guarantorErr } = await supabase.from('guarantor_details').insert(guarantorRows);
    if (guarantorErr) throw guarantorErr;

    // 4. application_status_history — audit trail entry
    const { error: historyErr } = await supabase.from('application_status_history').insert({
      loan_application_id: applicationId,
      from_status: 'draft',
      to_status: 'submitted',
      changed_by: session.dealer_user_id,
      changed_by_type: 'dealer_user',
      remarks: 'Application submitted via Dealer App',
    });
    if (historyErr) throw historyErr;

    return res.status(200).json({
      success: true,
      application_id: applicationId,
      application_no: applicationNo,
      customer_id: customerId,
      status: 'submitted',
    });
  } catch (e) {
    console.error('[create-loan-application]', e.message || e);

    // Best-effort manual rollback since Supabase JS has no cross-table transaction.
    if (applicationId) {
      await supabase.from('guarantor_details').delete().eq('loan_application_id', applicationId);
      await supabase.from('application_status_history').delete().eq('loan_application_id', applicationId);
      await supabase.from('loan_applications').delete().eq('id', applicationId);
    }
    if (customerId) {
      await supabase.from('customer_profiles').delete().eq('id', customerId);
    }

    return sendError(res, 500, 'Could not save application. Please try again.');
  }
}
