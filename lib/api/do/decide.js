// POST /api/do/decide
//
// Approves or rejects a loan application that has a completed FI report.
// DO-only (JWT).
// Body: { loan_application_id, decision ('approved'|'rejected'), remarks }

import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireUserAuth(req, res, ['do']);
  if (!session) return;

  try {
    const { loan_application_id, decision, remarks } = req.body || {};

    if (!loan_application_id) return sendError(res, 422, 'loan_application_id is required');
    if (!['approved', 'rejected'].includes(decision)) {
      return sendError(res, 422, "decision must be 'approved' or 'rejected'");
    }

    const supabase = getSupabase();

    const { data: application, error: appErr } = await supabase
      .from('loan_applications')
      .select('id, application_status, approval_valid_until')
      .eq('id', loan_application_id)
      .maybeSingle();
    if (appErr) {
      console.error('[do/decide]', appErr.message);
      return sendError(res, 500, 'Could not record decision.');
    }
    if (!application) return sendError(res, 404, 'Application not found');
    if (application.application_status !== 'fi_done') {
      return sendError(res, 422, `Application is in '${application.application_status}' status, not ready for DO decision.`);
    }

    const { error: updateErr } = await supabase
      .from('loan_applications')
      .update({ application_status: decision, ...(decision === 'approved' ? { approval_valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), approved_at: new Date().toISOString() } : { approval_valid_until: null, approved_at: null }) })
      .eq('id', loan_application_id);
    if (updateErr) {
      console.error('[do/decide]', updateErr.message);
      return sendError(res, 500, 'Could not record decision.');
    }

    await supabase.from('application_status_history').insert({
      loan_application_id,
      from_status: 'fi_done',
      to_status: decision,
      changed_by: session.user_id,
      changed_by_type: 'do',
      remarks: decision === 'approved'
        ? `${remarks || ''}${remarks ? ' · ' : ''}Approval valid for 30 days`
        : (remarks || null),
    });

    return res.status(200).json({ success: true, message: `Application ${decision}.` });
  } catch (err) {
    console.error('[do/decide] unhandled', err);
    return sendError(res, 500, 'Could not record decision.');
  }
}
