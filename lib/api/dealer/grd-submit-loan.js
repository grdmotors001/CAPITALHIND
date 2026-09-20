// POST /api/dealer/grd-submit-loan
// Private bridge used by GRD Motors. Authenticates with X-GRD-BRIDGE-SECRET
// and creates the loan application directly in CHFPL's Supabase database.

import { getSupabase } from '../_lib/supabase.js';
import { sendError, methodGuard } from '../_lib/auth.js';
import { generateApplicationNo } from '../_lib/validate.js';
import bcrypt from 'bcryptjs';

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

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

async function findVehicleModel(supabase, vehicleLoan) {
  const grdModelId = Number(vehicleLoan.grd_model_id);
  const grdModelCode = text(vehicleLoan.grd_model_code);
  const modelName = text(
    vehicleLoan.grd_model_name ??
    vehicleLoan.vehicle_model ??
    vehicleLoan.model ??
    vehicleLoan.vehicle_model_name
  );

  if (!Number.isFinite(grdModelId) || grdModelId <= 0 || !modelName) {
    return null;
  }

  // GRD is the source of truth for model identity. First match by the
  // immutable GRD product id, then recover a legacy CHFPL row by name/code.
  const { data: byGrdId, error: grdIdErr } = await supabase
    .from('vehicle_model_master')
    .select('id, model_name, grd_model_id, grd_model_code')
    .eq('grd_model_id', grdModelId)
    .maybeSingle();
  if (grdIdErr) throw grdIdErr;
  if (byGrdId) return byGrdId;

  if (grdModelCode) {
    const { data: byCode, error: codeErr } = await supabase
      .from('vehicle_model_master')
      .select('id, model_name, grd_model_id, grd_model_code')
      .eq('grd_model_code', grdModelCode)
      .maybeSingle();
    if (codeErr) throw codeErr;
    if (byCode) {
      const { data: updated, error: updateErr } = await supabase
        .from('vehicle_model_master')
        .update({ grd_model_id: grdModelId, model_name: modelName })
        .eq('id', byCode.id)
        .select('id, model_name, grd_model_id, grd_model_code')
        .single();
      if (updateErr) throw updateErr;
      return updated;
    }
  }

  const { data: byName, error: nameErr } = await supabase
    .from('vehicle_model_master')
    .select('id, model_name, grd_model_id, grd_model_code')
    .eq('model_name', modelName)
    .maybeSingle();
  if (nameErr) throw nameErr;
  if (byName) {
    const { data: updated, error: updateErr } = await supabase
      .from('vehicle_model_master')
      .update({ grd_model_id: grdModelId, grd_model_code: grdModelCode })
      .eq('id', byName.id)
      .select('id, model_name, grd_model_id, grd_model_code')
      .single();
    if (updateErr) throw updateErr;
    return updated;
  }

  // New model: create the CHFPL mirror from GRD master data. The local
  // vehicle_type/price are compatibility fields; model identity remains GRD's.
  const { data: created, error: createErr } = await supabase
    .from('vehicle_model_master')
    .insert({
      grd_model_id: grdModelId,
      grd_model_code: grdModelCode,
      model_name: modelName,
      vehicle_type: text(vehicleLoan.vehicle_type) || '3W',
      ex_showroom_price: num(vehicleLoan.vehicle_price)
    })
    .select('id, model_name, grd_model_id, grd_model_code')
    .single();
  if (createErr) throw createErr;
  return created;
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
    const dealerCode = text(dealerInfo.code) || text(dealerInfo.login_id);
    const dealerName = text(dealerInfo.name) || dealerCode || 'GRD Dealer';
    const dealerMobile = text(dealerInfo.mobile);
    const dealerLoginId = text(dealerInfo.login_id);

    // GRD is the source of truth for dealer master data. CHFPL does not
    // require a separately maintained dealer list for this bridge: create or
    // update the corresponding CHFPL dealer record from the GRD payload.
    let dealer = null;
    if (dealerCode) {
      const { data: existingDealer, error: dealerLookupErr } = await supabase
        .from('dealer_master')
        .select('id, dealer_name, dealer_code')
        .eq('dealer_code', dealerCode)
        .maybeSingle();
      if (dealerLookupErr) throw dealerLookupErr;
      dealer = existingDealer;
    }

    if (!dealer) {
      const { data: createdDealer, error: dealerCreateErr } = await supabase
        .from('dealer_master')
        .insert({
          dealer_code: dealerCode,
          dealer_name: dealerName
        })
        .select('id, dealer_name, dealer_code')
        .single();
      if (dealerCreateErr) throw dealerCreateErr;
      dealer = createdDealer;
    } else if (dealerName && dealer.dealer_name !== dealerName) {
      const { data: updatedDealer, error: dealerUpdateErr } = await supabase
        .from('dealer_master')
        .update({ dealer_name: dealerName })
        .eq('id', dealer.id)
        .select('id, dealer_name, dealer_code')
        .single();
      if (dealerUpdateErr) throw dealerUpdateErr;
      dealer = updatedDealer;
    }

    // A bridge submission also bootstraps the matching CHFPL dealer user.
    // The user is created inactive only if no usable phone/login identity is
    // supplied; otherwise it is active and can own the submitted application.
    const dealerUserPhone = dealerMobile || dealerLoginId || dealerCode;
    if (!dealerUserPhone) {
      return sendError(res, 422, 'Dealer mobile/login identity is required');
    }

    const { data: existingDealerUser, error: dealerUserLookupErr } = await supabase
      .from('dealer_users')
      .select('id, dealer_id, full_name, phone, is_active')
      .eq('dealer_id', dealer.id)
      .maybeSingle();
    if (dealerUserLookupErr) throw dealerUserLookupErr;

    let dealerUser = existingDealerUser;
    if (!dealerUser) {
      const passwordHash = await bcrypt.hash(
        `GRD-BRIDGE-${dealerCode}-${process.env.CHFPL_GRD_BRIDGE_SECRET || 'bridge'}`,
        10
      );
      const { data: createdDealerUser, error: dealerUserCreateErr } = await supabase
        .from('dealer_users')
        .insert({
          dealer_id: dealer.id,
          full_name: dealerName,
          phone: dealerUserPhone,
          password_hash: passwordHash,
          role: 'dealer',
          is_active: true
        })
        .select('id, dealer_id, full_name, phone, is_active')
        .single();
      if (dealerUserCreateErr) throw dealerUserCreateErr;
      dealerUser = createdDealerUser;
    } else if (!dealerUser.is_active) {
      const { data: activatedDealerUser, error: activateErr } = await supabase
        .from('dealer_users')
        .update({ is_active: true, full_name: dealerName })
        .eq('id', dealerUser.id)
        .select('id, dealer_id, full_name, phone, is_active')
        .single();
      if (activateErr) throw activateErr;
      dealerUser = activatedDealerUser;
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
