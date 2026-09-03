// POST /api/admin/assign-fe
//
// Assigns a loan application to a Field Executive, moving it into the FI
// (Field Investigation) queue. Admin-only (JWT).
// Body: { loan_application_id, fe_user_id }

import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { loan_application_id, fe_user_id, cibil_score } = req.body || {};
    const parsedCibil = Number(cibil_score);
    if (!loan_application_id || !fe_user_id) {
      return sendError(res, 422, 'loan_application_id and fe_user_id are required');
    }
    if (!Number.isInteger(parsedCibil) || parsedCibil < 300 || parsedCibil > 900) {
      return sendError(res, 422, 'Valid CIBIL score (300-900) is required before assignment.');
    }

    const supabase = getSupabase();

    const { data: fe, error: feErr } = await supabase
      .from('users')
      .select('id, full_name, role, is_active')
      .eq('id', fe_user_id)
      .maybeSingle();
    if (feErr) {
      console.error('[admin/assign-fe]', feErr.message);
      return sendError(res, 500, 'Could not assign application.');
    }
    if (!fe || fe.role !== 'field_executive' || !fe.is_active) {
      return sendError(res, 422, 'fe_user_id must be an active Field Executive');
    }

    const { data: application, error: appErr } = await supabase
      .from('loan_applications')
      .select('id, application_status, cibil_score')
      .eq('id', loan_application_id)
      .maybeSingle();
    if (appErr) {
      console.error('[admin/assign-fe]', appErr.message);
      return sendError(res, 500, 'Could not assign application.');
    }
    if (!application) return sendError(res, 404, 'Application not found');
    if (!['submitted', 'fi_pending'].includes(application.application_status)) {
      return sendError(res, 422, `Application is in '${application.application_status}' status and can't be (re)assigned.`);
    }

    const { error: updateErr } = await supabase
      .from('loan_applications')
      .update({
        cibil_score: parsedCibil,
        cibil_checked_at: new Date().toISOString(),
        assigned_fe_id: fe_user_id,
        assigned_at: new Date().toISOString(),
        application_status: 'fi_pending',
      })
      .eq('id', loan_application_id);
    if (updateErr) {
      console.error('[admin/assign-fe]', updateErr.message);
      return sendError(res, 500, 'Could not assign application.');
    }

    await supabase.from('application_status_history').insert({
      loan_application_id,
      from_status: application.application_status,
      to_status: 'fi_pending',
      changed_by: session.user_id,
      changed_by_type: 'admin',
      remarks: `CIBIL ${parsedCibil}; assigned to Field Executive: ${fe.full_name}`,
    });

    return res.status(200).json({ success: true, message: `Assigned to ${fe.full_name}.` });
  } catch (err) {
    console.error('[admin/assign-fe] unhandled', err);
    return sendError(res, 500, 'Could not assign application.');
  }
}
