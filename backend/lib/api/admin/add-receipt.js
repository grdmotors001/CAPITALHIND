// POST /api/admin/add-receipt — manual receipt entry against a loan.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireAdminAuth(req, res); if (!session) return;
  try {
    const { loan_application_id, receipt_no, receipt_date, amount, payment_mode, reference_no, remarks } = req.body || {};
    if (!loan_application_id || !amount) return sendError(res, 422, 'Loan and amount are required.');
    const supabase = getSupabase();
    const generatedReceiptNo = String(receipt_no || '').trim() || `RCPT-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase.from('loan_receipts').insert({
      loan_application_id, receipt_no: generatedReceiptNo, receipt_date: receipt_date || new Date().toISOString().slice(0,10),
      amount: Number(amount), payment_mode: payment_mode || 'cash', reference_no: String(reference_no || '').trim() || null,
      remarks: String(remarks || '').trim() || null, entered_by: session.user_id,
    }).select('*').single();
    if (error) return sendError(res, 500, error.message.includes('duplicate') ? 'Receipt number already exists.' : 'Could not save receipt.');
    await supabase.from('loan_applications').update({ receipt_entry_manual: true }).eq('id', loan_application_id);
    return res.status(200).json({ success: true, receipt: data, message: 'Receipt entry saved.' });
  } catch (e) { console.error('[admin/add-receipt]', e); return sendError(res, 500, 'Could not save receipt.'); }
}
