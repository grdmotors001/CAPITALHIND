// POST /api/dealer/grd-submit-loan
// Private bridge used by GRD Motors. Authenticates with X-GRD-BRIDGE-SECRET
// and creates the loan application directly in CHFPL's Supabase database.

import { getSupabase } from '../_lib/supabase.js';
import { sendError, methodGuard } from '../_lib/auth.js';
import { generateApplicationNo } from '../_lib/validate.js';

function maskAadhaar(value) {
  const s = String(value || '').replace(/\D/g, '');
  return s.length >= 4 ? `XXXX-XXXX-${s.slice(-4)}` : null;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function text(value) {
  const s = String(value ?? '').trim();
  return s || null;
}

async function findVehicleModel(supabase, vehicleLoan) {
  const rawId = vehicleLoan.vehicle_model_id ?? vehicleLoan.model_id;
  if (rawId && /^\d+$/.test(String(rawId))) {
    const { data, error } = await supabase
      .from('vehicle_model_master')
      .select('id, model_name')
      .eq('id', Number(rawId))
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const name = text(
    vehicleLoan.vehicle_model ??
    vehicleLoan.model ??
    vehicleLoan.vehicle_model_name
  );
  if (!name) return null;

  const { data, error } = await supabase
    .from('vehicle_model_master')
    .select('id, model_name')
    .ilike('model_name', name)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const expected = String(process.env.CHFPL_GRD_BRIDGE_SECRET || '');
  const supplied = String(req.headers['x-grd-bridge-secret'] || '');
  if (!expected || !supplied || supplied !== expected) {
    return sendError(res, 401, 'Invalid GRD bridge secret');
  }

  const body = req.body || {};
  const borrower = body.borrower || {};
  const guarantor = body.guarantor || {};
  const coBorrower = body.co_borrower || {};
  const vehicleLoan = body.vehicle_loan || {};
  const dealerInfo = body.dealer || {};

  if (!borrower.full_name || !borrower.phone) {
    return sendError(res, 422, 'Borrower name and phone are required');
  }

  if (!/^\d{12}$/.test(String(borrower.aadhaar || ''))) {
    return sendError(res, 422, '12-digit Aadhaar is required');
  }

  if (!dealerInfo.code && !dealerInfo.login_id) {
    return sendError(res, 422, 'Dealer identification is required');
  }

  const supabase = getSupabase();

  try {
    // Resolve the dealer from GRD's code first. During the rollout, some
    // CHFPL dealer-master rows may not have the same code as GRD, so fall
    // back to the exact dealer name and then mobile before rejecting.
    const dealerCode = text(dealerInfo.code);
    const dealerName = text(dealerInfo.name);
    const dealerMobile = text(dealerInfo.mobile);

    let dealer = null;
    if (dealerCode) {
      const { data, error } = await supabase
        .from('dealer_master')
        .select('id, dealer_name, dealer_code')
        .eq('dealer_code', dealerCode)
        .maybeSingle();
      if (error) throw error;
      dealer = data;
    }

    if (!dealer && dealerName) {
      const { data, error } = await supabase
        .from('dealer_master')
        .select('id, dealer_name, dealer_code')
        .ilike('dealer_name', dealerName)
        .maybeSingle();
      if (error) throw error;
      dealer = data;
    }

    // dealer_master does not store mobile in the current CHFPL schema.
    // If code/name did not resolve, try the dealer_users table by phone and
    // use its dealer_id to resolve the master dealer.
    if (!dealer && dealerMobile) {
      const { data: dealerUserByMobile, error } = await supabase
        .from('dealer_users')
        .select('dealer_id')
        .eq('phone', dealerMobile)
        .maybeSingle();
      if (error) throw error;
      if (dealerUserByMobile?.dealer_id) {
        const { data, error: dealerByUserIdErr } = await supabase
          .from('dealer_master')
          .select('id, dealer_name, dealer_code')
          .eq('id', dealerUserByMobile.dealer_id)
          .maybeSingle();
        if (dealerByUserIdErr) throw dealerByUserIdErr;
        dealer = data;
      }
    }

    if (!dealer) {
      return sendError(res, 404, 'CHFPL dealer not found for supplied code/name/mobile');
    }

    const loginId = text(dealerInfo.login_id);
    let dealerUser = null;
    if (loginId) {
      const { data, error } = await supabase
        .from('dealer_users')
        .select('id, dealer_id, full_name, phone, is_active')
        .eq('dealer_id', dealer.id)
        .eq('phone', loginId)
        .maybeSingle();
      if (error) throw error;
      dealerUser = data;
    }

    if (!dealerUser && dealerInfo.mobile) {
      const { data, error } = await supabase
        .from('dealer_users')
        .select('id, dealer_id, full_name, phone, is_active')
        .eq('dealer_id', dealer.id)
        .eq('phone', String(dealerInfo.mobile).trim())
        .maybeSingle();
      if (error) throw error;
      dealerUser = data;
    }

    if (!dealerUser || !dealerUser.is_active) {
      return sendError(res, 422, 'Active CHFPL dealer user could not be resolved');
    }

    const vehicleModel = await findVehicleModel(supabase, vehicleLoan);
    if (!vehicleModel) {
      return sendError(res, 422, 'Vehicle model was not found in CHFPL Vehicle Master');
    }

    const { data: customerRow, error: customerErr } = await supabase
      .from('customer_profiles')
      .insert({
        full_name: text(borrower.full_name),
        phone: text(borrower.phone),
        email: text(borrower.email),
        dob: borrower.dob || null,
        gender: text(borrower.gender),
        address: text(borrower.address) || 'Not provided',
        city: text(borrower.city),
        state: text(borrower.state),
        pincode: text(borrower.pincode) || '000000',
        pan: text(borrower.pan) || 'NOT-PROVIDED',
        aadhaar_masked: maskAadhaar(borrower.aadhaar),
        occupation: text(borrower.occupation),
        monthly_income: num(borrower.monthly_income) || null,
        created_by_dealer_id: dealer.id
      })
      .select('id')
      .single();
    if (customerErr) throw customerErr;

    const applicationNo = await generateApplicationNo(supabase);

    const { data: application, error: applicationErr } = await supabase
      .from('loan_applications')
      .insert({
        application_no: applicationNo,
        dealer_id: dealer.id,
        dealer_user_id: dealerUser.id,
        customer_id: customerRow.id,
        vehicle_model_id: vehicleModel.id,
        vehicle_price: num(vehicleLoan.vehicle_price),
        down_payment: num(vehicleLoan.down_payment),
        loan_amount_requested: num(vehicleLoan.loan_amount_requested),
        tenure_months: Math.max(1, Math.round(num(vehicleLoan.tenure_months))),
        physical_register_serial_no: text(body.dealer_register_page_no),
        application_status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .select('id, application_no, application_status')
      .single();
    if (applicationErr) throw applicationErr;

    const guarantorName = text(guarantor.full_name);
    if (guarantorName) {
      const { error } = await supabase.from('guarantor_details').insert({
        loan_application_id: application.id,
        full_name: guarantorName,
        relation_with_customer: text(guarantor.relation_with_customer),
        phone: text(guarantor.phone) || 'NOT-PROVIDED',
        address: text(guarantor.address),
        pan: text(guarantor.pan),
        aadhaar_masked: maskAadhaar(guarantor.aadhaar)
      });
      if (error) throw error;
    }

    const coName = text(coBorrower.full_name);
    if (coName) {
      const { error } = await supabase.from('co_borrower_details').insert({
        loan_application_id: application.id,
        full_name: coName,
        relation_with_customer: text(coBorrower.relation_with_customer),
        phone: text(coBorrower.phone),
        email: text(coBorrower.email),
        dob: coBorrower.dob || null,
        gender: text(coBorrower.gender),
        address: text(coBorrower.address),
        city: text(coBorrower.city),
        state: text(coBorrower.state),
        pincode: text(coBorrower.pincode),
        pan: text(coBorrower.pan),
        aadhaar_masked: maskAadhaar(coBorrower.aadhaar),
        occupation: text(coBorrower.occupation),
        monthly_income: num(coBorrower.monthly_income) || null
      });
      if (error) throw error;
    }

    const { error: historyErr } = await supabase
      .from('application_status_history')
      .insert({
        loan_application_id: application.id,
        from_status: 'draft',
        to_status: 'submitted',
        changed_by: dealerUser.id,
        changed_by_type: 'dealer_user',
        remarks: 'Submitted from GRD Motors dealer system'
      });
    if (historyErr) throw historyErr;

    return res.status(200).json({
      success: true,
      application_id: application.id,
      application_no: application.application_no,
      status: application.application_status,
      dealer_id: dealer.id,
      customer_id: customerRow.id,
      vehicle_model: vehicleModel.model_name,
      grd_submission_ref: text(body.grd_submission_ref)
    });
  } catch (err) {
    console.error('[grd-submit-loan]', err);
    return sendError(res, 500, 'Could not create GRD loan application in CHFPL');
  }
}
