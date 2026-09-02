// GET /api/admin/applicants — applicant register with full application/customer data.
// POST /api/admin/applicants — admin edit of applicant + application details.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

const clean = (v) => (v === undefined || v === null ? '' : String(v).trim());
const nullable = (v) => clean(v) || null;
const numOrNull = (v) => clean(v) === '' ? null : Number(v);
const dateOrNull = (v) => clean(v) || null;

const APP_FIELDS = [
  'application_no','application_status','vehicle_price','down_payment','loan_amount_requested','tenure_months',
  'loan_account_no','vehicle_no','chassis_no','ledger_no','file_no','file_record_no','cheques_qty',
  'hypothecation','do_no','case_received_date','fi_send_date','fi_received_date','fi_status','fi_executive_name',
  'sanction_date','approved_by','file_received_date','file_check_date','interest_rate','interest_amount',
  'principal_amount','emi_no','emi_amount','vehicle_registration_date','approval_valid_until','cibil_score',
  'disbursement_date','disbursed_amount','case_status'
];

function shape(row, guarantors = [], coBorrower = null) {
  return {
    ...row,
    customer: row.customer_profiles || null,
    dealer: row.dealer_master || null,
    vehicle_model: row.vehicle_model_master || null,
    guarantors,
    co_borrower: coBorrower,
  };
}

export default async function handler(req, res) {
  const session = requireAdminAuth(req, res);
  if (!session) return;
  const s = getSupabase();
  try {
    if (methodGuard(req, res, 'GET')) {
      const { data, error } = await s.from('loan_applications').select(`
        id, application_no, application_status, loan_account_no, dealer_id, dealer_user_id, customer_id, vehicle_model_id,
        vehicle_price, down_payment, loan_amount_requested, tenure_months, submitted_at, created_at,
        assigned_fe_id, assigned_at, cibil_score, cibil_checked_at, approval_valid_until, approved_at,
        vehicle_no, chassis_no, ledger_no, file_no, file_record_no, cheques_qty, case_status, suit_filed_at, vehicle_seized_at,
        disbursement_date, disbursed_amount, receipt_entry_manual, hypothecation, do_no, case_received_date, fi_send_date,
        fi_received_date, fi_status, fi_executive_name, sanction_date, approved_by, file_received_date, file_check_date,
        interest_rate, interest_amount, principal_amount, emi_no, emi_amount, vehicle_registration_date,
        customer_profiles(*), dealer_master(dealer_name,dealer_code,city,state,contact_phone,contact_email),
        vehicle_model_master(id,model_name,vehicle_type,ex_showroom_price,battery_capacity,oem_id)
      `).order('created_at', { ascending: false }).limit(500);
      if (error) { console.error('[admin/applicants GET]', error.message); return sendError(res, 500, 'Could not load applicants.'); }
      const rows = data || [];
      const ids = rows.map(r => r.id);
      const [gRes, cbRes] = await Promise.all([
        ids.length ? s.from('guarantor_details').select('*').in('loan_application_id', ids) : Promise.resolve({data:[],error:null}),
        ids.length ? s.from('co_borrower_details').select('*').in('loan_application_id', ids) : Promise.resolve({data:[],error:null}),
      ]);
      if (gRes.error) console.warn('[admin/applicants] guarantors:', gRes.error.message);
      if (cbRes.error) console.warn('[admin/applicants] co-borrower:', cbRes.error.message);
      const gMap = {};
      (gRes.data || []).forEach(g => (gMap[g.loan_application_id] ||= []).push(g));
      const cbMap = Object.fromEntries((cbRes.data || []).map(c => [c.loan_application_id, c]));
      return res.status(200).json({ success: true, applicants: rows.map(r => shape(r, gMap[r.id] || [], cbMap[r.id] || null)) });
    }

    if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
    const body = req.body || {};
    const id = Number(body.id);
    if (!Number.isInteger(id)) return sendError(res, 422, 'Applicant id is required.');

    const customer = body.customer || {};
    const loan = body.loan || {};
    const { data: current, error: currentErr } = await s.from('loan_applications').select('id,customer_id').eq('id', id).maybeSingle();
    if (currentErr) return sendError(res, 500, 'Could not load applicant.');
    if (!current) return sendError(res, 404, 'Applicant not found.');
    const { data: currentCustomer, error: currentCustomerErr } = await s.from('customer_profiles').select('*').eq('id', current.customer_id).maybeSingle();
    if (currentCustomerErr || !currentCustomer) return sendError(res, 500, 'Could not load applicant profile.');

    const customerUpdate = {
      full_name: clean(customer.full_name) || currentCustomer.full_name,
      phone: clean(customer.phone) || currentCustomer.phone,
      email: Object.prototype.hasOwnProperty.call(customer,'email') ? nullable(customer.email) : currentCustomer.email,
      dob: Object.prototype.hasOwnProperty.call(customer,'dob') ? dateOrNull(customer.dob) : currentCustomer.dob,
      gender: Object.prototype.hasOwnProperty.call(customer,'gender') ? nullable(customer.gender) : currentCustomer.gender,
      address: clean(customer.address) || currentCustomer.address,
      city: Object.prototype.hasOwnProperty.call(customer,'city') ? nullable(customer.city) : currentCustomer.city,
      state: Object.prototype.hasOwnProperty.call(customer,'state') ? nullable(customer.state) : currentCustomer.state,
      pincode: clean(customer.pincode) || currentCustomer.pincode,
      pan: clean(customer.pan) || currentCustomer.pan,
      aadhaar_masked: clean(customer.aadhaar_masked) || currentCustomer.aadhaar_masked,
      occupation: Object.prototype.hasOwnProperty.call(customer,'occupation') ? nullable(customer.occupation) : currentCustomer.occupation,
      monthly_income: Object.prototype.hasOwnProperty.call(customer,'monthly_income') ? numOrNull(customer.monthly_income) : currentCustomer.monthly_income,
      ownership_status: Object.prototype.hasOwnProperty.call(customer,'ownership_status') ? nullable(customer.ownership_status) : currentCustomer.ownership_status,
      landmark: Object.prototype.hasOwnProperty.call(customer,'landmark') ? nullable(customer.landmark) : currentCustomer.landmark,
      electricity_ca_no: Object.prototype.hasOwnProperty.call(customer,'electricity_ca_no') ? nullable(customer.electricity_ca_no) : currentCustomer.electricity_ca_no,
    };
    if (!customerUpdate.full_name || !customerUpdate.phone) return sendError(res, 422, 'Applicant name and mobile are required.');
    const { error: cErr } = await s.from('customer_profiles').update(customerUpdate).eq('id', current.customer_id);
    if (cErr) return sendError(res, 500, 'Could not update applicant details.');

    const update = {};
    for (const key of APP_FIELDS) if (Object.prototype.hasOwnProperty.call(loan, key)) update[key] = loan[key];
    for (const key of ['vehicle_price','down_payment','loan_amount_requested','interest_rate','interest_amount','principal_amount','emi_amount','disbursed_amount']) {
      if (Object.prototype.hasOwnProperty.call(update, key)) update[key] = numOrNull(update[key]);
    }
    for (const key of ['tenure_months','cheques_qty','emi_no','cibil_score']) {
      if (Object.prototype.hasOwnProperty.call(update, key)) update[key] = clean(update[key]) === '' ? null : Number(update[key]);
    }
    for (const key of ['case_received_date','fi_send_date','fi_received_date','sanction_date','file_received_date','file_check_date','vehicle_registration_date','approval_valid_until','disbursement_date']) {
      if (Object.prototype.hasOwnProperty.call(update, key)) update[key] = dateOrNull(update[key]);
    }
    for (const key of APP_FIELDS) {
      if (typeof update[key] === 'string' && ['application_no','application_status','loan_account_no','vehicle_no','chassis_no','ledger_no','file_no','file_record_no','hypothecation','do_no','fi_status','fi_executive_name','approved_by','case_status'].includes(key)) update[key] = nullable(update[key]);
    }
    if (Object.keys(update).length) {
      const { error: lErr } = await s.from('loan_applications').update(update).eq('id', id);
      if (lErr) return sendError(res, 500, 'Could not update applicant application details.');
    }

    return res.status(200).json({ success: true, message: 'Applicant updated successfully.' });
  } catch (e) {
    console.error('[admin/applicants]', e);
    return sendError(res, 500, 'Could not process applicant.');
  }
}
