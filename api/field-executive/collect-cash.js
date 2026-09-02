// POST /api/field-executive/collect-cash
// Field Executive may collect cash only against a disbursed loan assigned to them.
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireUserAuth(req, res, ['field_executive']);
  if (!session) return;

  try {
    const { loan_application_id, amount, receipt_date, remarks } = req.body || {};
    const numericAmount = Number(amount);
    if (!loan_application_id || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return sendError(res, 422, 'Loan and a valid cash amount are required.');
    }

    const supabase = getSupabase();
    const { data: loan, error: loanErr } = await supabase
      .from('loan_applications')
      .select('id, application_no, loan_account_no, application_status, assigned_fe_id, customer_profiles(full_name, phone)')
      .eq('id', loan_application_id)
      .maybeSingle();

    if (loanErr) return sendError(res, 500, 'Could not verify loan.');
    if (!loan) return sendError(res, 404, 'Loan not found.');
    if (loan.assigned_fe_id !== session.user_id) {
      return sendError(res, 403, 'This loan is not assigned to you.');
    }
    if (loan.application_status !== 'disbursed') {
      return sendError(res, 422, 'Cash collection is allowed only for disbursed loans.');
    }

    const receiptNo = `FE-CASH-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Date.now().toString().slice(-7)}`;
    const collectedAt = new Date().toISOString();
    const { data: receipt, error: receiptErr } = await supabase
      .from('loan_receipts')
      .insert({
        loan_application_id,
        receipt_no: receiptNo,
        receipt_date: receipt_date || collectedAt.slice(0,10),
        amount: numericAmount,
        payment_mode: 'cash',
        remarks: String(remarks || '').trim() || null,
        entered_by: session.user_id,
        collection_source: 'field_executive',
        collected_at: collectedAt,
      })
      .select('*')
      .single();

    if (receiptErr) {
      console.error('[field-executive/collect-cash]', receiptErr.message);
      return sendError(res, 500, 'Could not save cash collection.');
    }

    await supabase.from('loan_applications')
      .update({ receipt_entry_manual: true })
      .eq('id', loan_application_id);

    return res.status(200).json({
      success: true,
      message: `Cash collection of ₹${numericAmount.toLocaleString('en-IN')} recorded.`,
      receipt: {
        id: receipt.id,
        receipt_no: receipt.receipt_no,
        receipt_date: receipt.receipt_date,
        amount: receipt.amount,
        customer_name: loan.customer_profiles?.full_name || null,
      },
    });
  } catch (err) {
    console.error('[field-executive/collect-cash] unhandled', err);
    return sendError(res, 500, 'Could not save cash collection.');
  }
}
