// POST /api/tele-caller/log-call
// Body: { loan_application_id, outcome, notes?, callback_at? }
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

const OUTCOMES = ['connected','not_connected','callback','interested','not_interested','wrong_number','promise_to_pay','paid','do_not_call'];
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireUserAuth(req, res, ['tele_caller']);
  if (!session) return;
  try {
    const loanId = String(req.body?.loan_application_id || '').trim();
    const outcome = String(req.body?.outcome || '').trim();
    const notes = String(req.body?.notes || '').trim() || null;
    const callbackAt = req.body?.callback_at ? new Date(req.body.callback_at).toISOString() : null;
    if (!loanId || !OUTCOMES.includes(outcome)) return sendError(res, 422, 'Application and valid call outcome are required');
    const supabase = getSupabase();
    // Tele Caller can currently log calls against any loan case.
    // Field Executive access remains restricted by its own role-specific API.
    const { data: app } = await supabase.from('loan_applications').select('id, loan_account_no').eq('id', loanId).not('loan_account_no', 'is', null).maybeSingle();
    if (!app) return sendError(res, 404, 'Loan case not found');
    const { data, error } = await supabase.from('telecaller_call_logs').insert({ loan_application_id: loanId, telecaller_id: session.user_id, outcome, notes, callback_at: callbackAt }).select('id, loan_application_id, outcome, notes, callback_at, called_at').single();
    if (error) return sendError(res, 500, 'Could not save call details');
    return res.status(200).json({ success: true, message: 'Call details saved.', call: data });
  } catch (err) {
    console.error('[tele-caller/log-call] unhandled', err);
    return sendError(res, 500, 'Could not save call details');
  }
}
