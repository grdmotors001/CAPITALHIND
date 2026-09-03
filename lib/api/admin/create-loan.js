// POST /api/admin/create-loan
// Converts one approved application into a loan account.
// Body: { loan_application_id, loan_account_no? }
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

function makeAccountNo(count) {
  const year = new Date().getFullYear();
  return `CHF-${year}-LN-${String(count + 1).padStart(5, '0')}`;
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const {
      loan_application_id, loan_account_no, vehicle_no, chassis_no, ledger_no, file_no,
      cheques_qty, file_record_no, case_status, disbursement_date, disbursed_amount
    } = req.body || {};
    if (!loan_application_id) return sendError(res, 422, 'loan_application_id is required');

    const supabase = getSupabase();
    const { data: application, error: appErr } = await supabase
      .from('loan_applications')
      .select('id, application_no, application_status, loan_account_no, approval_valid_until, tvr_status')
      .eq('id', loan_application_id)
      .maybeSingle();

    if (appErr) {
      console.error('[admin/create-loan]', appErr.message);
      return sendError(res, 500, 'Could not load approved application.');
    }
    if (!application) return sendError(res, 404, 'Application not found.');
    if (application.application_status !== 'approved') {
      return sendError(res, 422, `Only approved applications can be created as loans. Current status: ${application.application_status}`);
    }
    if (application.tvr_status !== 'verified') {
      return sendError(res, 422, `TVR is not verified. Current TVR status: ${application.tvr_status || 'pending'}.`);
    }
    if (application.approval_valid_until && application.approval_valid_until < new Date().toISOString().slice(0, 10)) {
      return sendError(res, 422, `Approval validity expired on ${application.approval_valid_until}. Re-approval is required.`);
    }
    if (application.loan_account_no) {
      return res.status(409).json({ success: false, error: `Loan already created: ${application.loan_account_no}` });
    }

    let accountNo = String(loan_account_no || '').trim();
    if (!accountNo) {
      const { count, error: countErr } = await supabase
        .from('loan_applications')
        .select('id', { count: 'exact', head: true })
        .not('loan_account_no', 'is', null);
      if (countErr) {
        console.error('[admin/create-loan]', countErr.message);
        return sendError(res, 500, 'Could not generate loan account number.');
      }
      accountNo = makeAccountNo(count || 0);
    }

    const { data: existing, error: existingErr } = await supabase
      .from('loan_applications')
      .select('id')
      .eq('loan_account_no', accountNo)
      .maybeSingle();
    if (existingErr) {
      console.error('[admin/create-loan]', existingErr.message);
      return sendError(res, 500, 'Could not validate loan account number.');
    }
    if (existing) return sendError(res, 409, 'Loan account number already exists.');

    const ledgerValue = String(ledger_no || '').trim().toUpperCase();
    const loanUpdate = {
      loan_account_no: accountNo,
      application_status: 'sanctioned',
      vehicle_no: String(vehicle_no || '').trim() || null,
      chassis_no: String(chassis_no || '').trim() || null,
      ledger_no: ledgerValue || null,
      file_no: String(file_no || '').trim() || null,
      cheques_qty: Math.max(0, Number(cheques_qty || 0)),
      file_record_no: String(file_record_no || '').trim() || null,
      case_status: case_status || 'active',
      disbursement_date: disbursement_date || null,
      disbursed_amount: disbursed_amount !== undefined && disbursed_amount !== '' ? Number(disbursed_amount) : null,
      receipt_entry_manual: false
    };
    if (ledgerValue) loanUpdate.physical_register_serial_no = ledgerValue;

    const { data: updated, error: updateErr } = await supabase
      .from('loan_applications')
      .update(loanUpdate)
      .eq('id', loan_application_id)
      .eq('application_status', 'approved')
      .select('id, application_no, loan_account_no, application_status, vehicle_no, chassis_no, ledger_no, file_no, cheques_qty, file_record_no, case_status, approval_valid_until')
      .single();

    if (updateErr) {
      console.error('[admin/create-loan]', updateErr.message);
      return sendError(res, 500, 'Could not create loan account.');
    }

    await supabase.from('application_status_history').insert({
      loan_application_id,
      from_status: 'approved',
      to_status: 'sanctioned',
      changed_by: session.user_id,
      changed_by_type: 'admin',
      remarks: `Loan account created: ${accountNo}`,
    });

    return res.status(200).json({
      success: true,
      message: `Loan created successfully. Account No: ${accountNo}`,
      loan: updated,
    });
  } catch (err) {
    console.error('[admin/create-loan] unhandled', err);
    return sendError(res, 500, 'Could not create loan account.');
  }
}
