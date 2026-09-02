// POST /api/field-executive/submit-fi
//
// Submits the (simplified) Field Investigation Report for an application
// assigned to the logged-in Field Executive. Moves the application from
// 'fi_pending' to 'fi_done', ready for DO review. Field-executive-only (JWT).
//
// Body: {
//   loan_application_id, visited_by, visit_date, residence_type ('rented'|'own'),
//   mobile_no, monthly_income, latitude, longitude, remarks,
//   recommendation ('positive'|'negative')
// }

import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireUserAuth(req, res, ['field_executive']);
  if (!session) return;

  try {
    const {
      loan_application_id,
      visit_date,
      residence_type,
      mobile_no,
      monthly_income,
      latitude,
      longitude,
      remarks,
      recommendation,
    } = req.body || {};

    const errors = [];
    if (!loan_application_id) errors.push('loan_application_id is required');
    if (!['positive', 'negative'].includes(recommendation)) errors.push("recommendation must be 'positive' or 'negative'");
    if (residence_type && !['rented', 'own'].includes(residence_type)) errors.push("residence_type must be 'rented' or 'own'");
    if (errors.length) {
      return res.status(422).json({ success: false, error: errors.join(', ') });
    }

    const supabase = getSupabase();

    const { data: application, error: appErr } = await supabase
      .from('loan_applications')
      .select('id, application_status, assigned_fe_id')
      .eq('id', loan_application_id)
      .maybeSingle();
    if (appErr) {
      console.error('[field-executive/submit-fi]', appErr.message);
      return sendError(res, 500, 'Could not submit report.');
    }
    if (!application) return sendError(res, 404, 'Application not found');
    if (application.assigned_fe_id !== session.user_id) {
      return sendError(res, 403, 'This application is not assigned to you.');
    }
    if (application.application_status !== 'fi_pending') {
      return sendError(res, 422, `Application is in '${application.application_status}' status, not pending FI.`);
    }

    const { error: fiErr } = await supabase.from('fi_reports').upsert(
      {
        loan_application_id,
        submitted_by: session.user_id,
        visited_by: null, // filled from users table via submitted_by join if needed
        visit_date: visit_date || new Date().toISOString().slice(0, 10),
        residence_type: residence_type || null,
        mobile_no: mobile_no || null,
        monthly_income: monthly_income || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        remarks: remarks || null,
        recommendation,
      },
      { onConflict: 'loan_application_id' }
    );
    if (fiErr) {
      console.error('[field-executive/submit-fi]', fiErr.message);
      return sendError(res, 500, 'Could not submit report.');
    }

    const { error: updateErr } = await supabase
      .from('loan_applications')
      .update({ application_status: 'fi_done' })
      .eq('id', loan_application_id);
    if (updateErr) {
      console.error('[field-executive/submit-fi]', updateErr.message);
      return sendError(res, 500, 'Could not submit report.');
    }

    await supabase.from('application_status_history').insert({
      loan_application_id,
      from_status: 'fi_pending',
      to_status: 'fi_done',
      changed_by: session.user_id,
      changed_by_type: 'field_executive',
      remarks: `FI submitted — recommendation: ${recommendation}`,
    });

    return res.status(200).json({ success: true, message: 'Field Investigation report submitted.' });
  } catch (err) {
    console.error('[field-executive/submit-fi] unhandled', err);
    return sendError(res, 500, 'Could not submit report.');
  }
}
