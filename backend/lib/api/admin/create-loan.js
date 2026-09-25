// POST /api/admin/create-loan
// Converts one approved application into an active loan account and starts
// its EMI schedule. Customer/dealer/application details come from the
// approved loan application; this endpoint only accepts the remaining
// physical-file, disbursement and EMI-start fields from the Create Loan form.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

function makeAccountNo(count) {
  const year = new Date().getFullYear();
  return `CHF-${year}-LN-${String(count + 1).padStart(5, '0')}`;
}

function dateOnly(value) {
  return String(value || '').slice(0, 10);
}

function addMonths(dateString, months) {
  const [y, m, d] = dateString.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

function buildEmiSchedule({ loanId, applicationId, amount, tenure, annualRate, firstEmiDate }) {
  const principal = Number(amount);
  const n = Number(tenure);
  const rate = Number(annualRate || 0) / 100 / 12;
  if (!(principal > 0) || !(n > 0) || !firstEmiDate) return [];

  let emi = rate > 0
    ? principal * rate * Math.pow(1 + rate, n) / (Math.pow(1 + rate, n) - 1)
    : principal / n;
  emi = Number(emi.toFixed(2));

  let opening = principal;
  const rows = [];
  for (let i = 1; i <= n; i += 1) {
    const interest = rate > 0 ? Number((opening * rate).toFixed(2)) : 0;
    const principalPart = i === n
      ? Number(opening.toFixed(2))
      : Number(Math.min(opening, Math.max(0, emi - interest)).toFixed(2));
    const payment = Number((principalPart + interest).toFixed(2));
    const closing = Number(Math.max(0, opening - principalPart).toFixed(2));
    rows.push({
      loan_id: loanId,
      loan_application_id: applicationId,
      emi_no: i,
      due_date: addMonths(firstEmiDate, i - 1),
      emi_amount: payment,
      principal_amount: principalPart,
      interest_amount: interest,
      opening_balance: Number(opening.toFixed(2)),
      closing_balance: closing,
      paid_amount: 0,
      status: 'PENDING',
    });
    opening = closing;
  }
  return rows;
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;

  const supabase = getSupabase();

  try {
    const {
      loan_application_id,
      vehicle_no,
      chassis_no,
      engine_no,
      ledger_no,
      file_no,
      cheques_qty,
      file_record_no,
      case_status,
      disbursement_date,
      disbursed_amount,
      interest_rate,
      first_emi_date,
      remarks,
    } = req.body || {};

    if (!loan_application_id) return sendError(res, 422, 'Approved loan application select karein.');

    const { data: application, error: appErr } = await supabase
      .from('loan_applications')
      .select('id, application_no, application_status, loan_account_no, approval_valid_until, tvr_status, loan_amount_requested, tenure_months, interest_rate, first_emi_date, emi_loan_id')
      .eq('id', loan_application_id)
      .maybeSingle();

    if (appErr) {
      console.error('[admin/create-loan] load application', appErr.message);
      return sendError(res, 500, 'Could not load approved application.');
    }
    if (!application) return sendError(res, 404, 'Application not found.');
    if (application.application_status !== 'approved') {
      return sendError(res, 422, `Only approved applications can be activated. Current status: ${application.application_status}`);
    }
    if (application.tvr_status !== 'verified') {
      return sendError(res, 422, `TVR is not verified. Current TVR status: ${application.tvr_status || 'pending'}.`);
    }
    if (application.approval_valid_until && application.approval_valid_until < new Date().toISOString().slice(0, 10)) {
      return sendError(res, 422, `Approval validity expired on ${application.approval_valid_until}. Re-approval is required.`);
    }
    if (application.loan_account_no || application.emi_loan_id) {
      return res.status(409).json({ success: false, error: `Loan already created: ${application.loan_account_no || 'EMI loan already exists'}` });
    }

    const rate = interest_rate !== undefined && interest_rate !== '' ? Number(interest_rate) : Number(application.interest_rate || 0);
    if (!Number.isFinite(rate) || rate < 0) return sendError(res, 422, 'Valid annual interest rate is required.');
    const tenure = Number(application.tenure_months || 0);
    if (!Number.isInteger(tenure) || tenure <= 0) return sendError(res, 422, 'Approved loan tenure is invalid.');

    const disbDate = dateOnly(disbursement_date) || new Date().toISOString().slice(0, 10);
    const firstEmiDate = dateOnly(first_emi_date);
    if (!firstEmiDate) return sendError(res, 422, 'First EMI Date is required.');

    const disbursed = disbursed_amount !== undefined && disbursed_amount !== ''
      ? Number(disbursed_amount)
      : Number(application.loan_amount_requested || 0);
    if (!(disbursed > 0)) return sendError(res, 422, 'Disbursed Amount must be greater than zero.');

    let accountNo = String(application.loan_account_no || '').trim();
    if (!accountNo) {
      const { count, error: countErr } = await supabase
        .from('loan_applications')
        .select('id', { count: 'exact', head: true })
        .not('loan_account_no', 'is', null);
      if (countErr) {
        console.error('[admin/create-loan] account count', countErr.message);
        return sendError(res, 500, 'Could not generate loan account number.');
      }
      accountNo = makeAccountNo(count || 0);
    }

    const { data: existing, error: existingErr } = await supabase
      .from('loan_applications')
      .select('id')
      .eq('loan_account_no', accountNo)
      .maybeSingle();
    if (existingErr) return sendError(res, 500, 'Could not validate loan account number.');
    if (existing) return sendError(res, 409, 'Loan account number already exists.');

    const loanId = crypto.randomUUID();
    const emiRows = buildEmiSchedule({
      loanId,
      applicationId: application.id,
      amount: Number(application.loan_amount_requested || 0),
      tenure,
      annualRate: rate,
      firstEmiDate,
    });
    if (!emiRows.length) return sendError(res, 422, 'Could not build EMI schedule from approved loan details.');

    const ledgerValue = String(ledger_no || '').trim().toUpperCase();
    const loanUpdate = {
      loan_account_no: accountNo,
      application_status: 'disbursed',
      lifecycle_status: 'ACTIVE',
      vehicle_no: String(vehicle_no || '').trim() || null,
      chassis_no: String(chassis_no || '').trim() || null,
      engine_no: String(engine_no || '').trim() || null,
      ledger_no: ledgerValue || null,
      file_no: String(file_no || '').trim() || null,
      cheques_qty: Math.max(0, Number(cheques_qty || 0)),
      file_record_no: String(file_record_no || '').trim() || null,
      case_status: case_status || 'active',
      disbursement_date: disbDate,
      disbursed_amount: disbursed,
      interest_rate: rate,
      first_emi_date: firstEmiDate,
      emi_loan_id: loanId,
      loan_remarks: String(remarks || '').trim() || null,
      emi_no: 0,
      emi_amount: emiRows[0].emi_amount,
      receipt_entry_manual: false,
    };
    if (ledgerValue) loanUpdate.physical_register_serial_no = ledgerValue;

    const { error: updateErr } = await supabase
      .from('loan_applications')
      .update(loanUpdate)
      .eq('id', application.id)
      .eq('application_status', 'approved');

    if (updateErr) {
      console.error('[admin/create-loan] loan update', updateErr.message);
      return sendError(res, 500, 'Could not activate loan account.');
    }

    const { error: scheduleErr } = await supabase.from('emi_schedule').insert(emiRows);
    if (scheduleErr) {
      console.error('[admin/create-loan] EMI schedule', scheduleErr.message);
      await supabase.from('loan_applications').update({
        loan_account_no: null,
        application_status: 'approved',
        lifecycle_status: 'APPROVED',
        emi_loan_id: null,
        first_emi_date: null,
        loan_remarks: null,
      }).eq('id', application.id);
      return sendError(res, 500, 'Loan was not activated because EMI schedule could not be created.');
    }

    const { error: disbErr } = await supabase.from('loan_disbursement_events').insert({
      loan_id: loanId,
      amount: disbursed,
      disbursement_date: disbDate,
      created_by: session.user_id || null,
    });
    if (disbErr) console.warn('[admin/create-loan] disbursement event:', disbErr.message);

    await supabase.from('application_status_history').insert({
      loan_application_id: application.id,
      from_status: 'approved',
      to_status: 'disbursed',
      changed_by: session.user_id,
      changed_by_type: 'admin',
      remarks: `Loan account ${accountNo} created and EMI schedule started.`,
    });

    await supabase.from('loan_status_history').insert({
      loan_application_id: application.id,
      old_status: 'APPROVED',
      new_status: 'ACTIVE',
      changed_by: session.user_id || null,
      remarks: `EMI schedule started for ${accountNo}.`,
    });

    return res.status(200).json({
      success: true,
      message: `Loan ${accountNo} activated and EMI schedule started.`,
      loan_account_no: accountNo,
      emi_count: emiRows.length,
      first_emi_date: firstEmiDate,
      emi_amount: emiRows[0].emi_amount,
    });
  } catch (err) {
    console.error('[admin/create-loan] unhandled', err);
    return sendError(res, 500, 'Could not activate loan account.');
  }
}
