// POST /api/field-executive/submit-tvr
// Submits TVR for an approved loan assigned to the logged-in FE.
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireUserAuth(req, res, ['field_executive']);
  if (!session) return;
  try {
    const b = req.body || {};
    const id = b.loan_application_id;
    const errors = [];
    if (!id) errors.push('loan_application_id is required');
    if (!['positive','negative','hold'].includes(b.recommendation)) errors.push('recommendation must be positive, negative, or hold');
    if (errors.length) return sendError(res, 422, errors.join(', '));
    const s = getSupabase();
    const { data: app, error: ae } = await s.from('loan_applications').select('id, application_no, application_status, assigned_fe_id, tvr_status').eq('id', id).maybeSingle();
    if (ae) return sendError(res, 500, 'Could not load approved application.');
    if (!app) return sendError(res, 404, 'Application not found.');
    if (app.assigned_fe_id !== session.user_id) return sendError(res, 403, 'This application is not assigned to you.');
    if (app.application_status !== 'approved') return sendError(res, 422, 'TVR can be submitted only after loan approval.');
    if (app.tvr_status === 'verified') return sendError(res, 409, 'TVR is already verified.');

    const payload = {
      loan_application_id:id, assigned_fe_id:session.user_id, status:'submitted',
      verification_date:b.verification_date || new Date().toISOString().slice(0,10),
      verification_time:b.verification_time || new Date().toTimeString().slice(0,5),
      customer_contacted:!!b.customer_contacted, applicant_confirmed:!!b.applicant_confirmed,
      address_confirmed:!!b.address_confirmed, employment_confirmed:!!b.employment_confirmed,
      reference_confirmed:!!b.reference_confirmed, documents_checked:!!b.documents_checked,
      vehicle_details_confirmed:!!b.vehicle_details_confirmed, alternate_mobile_no:String(b.alternate_mobile_no||'').trim()||null,
      reference_name:String(b.reference_name||'').trim()||null, reference_mobile:String(b.reference_mobile||'').trim()||null,
      remarks:String(b.remarks||'').trim()||null, recommendation:b.recommendation, updated_at:new Date().toISOString()
    };
    const { error: te } = await s.from('loan_tvrs').upsert(payload, { onConflict:'loan_application_id' });
    if (te) { console.error('[field-executive/submit-tvr]', te.message); return sendError(res, 500, 'Could not submit TVR.'); }
    const { error: ue } = await s.from('loan_applications').update({ tvr_status:'submitted' }).eq('id', id).eq('application_status','approved');
    if (ue) return sendError(res, 500, 'TVR saved but application status could not be updated.');
    await s.from('application_status_history').insert({ loan_application_id:id, from_status:'approved', to_status:'approved', changed_by:session.user_id, changed_by_type:'field_executive', remarks:`TVR submitted — recommendation: ${b.recommendation}` });
    return res.status(200).json({ success:true, message:'TVR submitted successfully. Awaiting verification.', tvr:payload });
  } catch (e) { console.error('[field-executive/submit-tvr] unhandled', e); return sendError(res, 500, 'Could not submit TVR.'); }
}
