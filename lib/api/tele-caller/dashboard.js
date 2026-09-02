// GET /api/tele-caller/dashboard
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireUserAuth(req, res, ['tele_caller']);
  if (!session) return;
  try {
    const supabase = getSupabase();
    const { data: registers, error: regErr } = await supabase.from('telecaller_registers').select('id, register_serial_no, assigned_at, is_active').eq('assigned_telecaller_id', session.user_id).eq('is_active', true).order('updated_at', { ascending: false });
    if (regErr) return sendError(res, 500, 'Could not load assigned registers');

    // Tele Caller visibility: for now every loan case is visible.
    // Field Executive remains restricted by its own API (assigned_fe_id).
    // Later this can be replaced by a permission/role matrix without changing the UI.
    const normalizeSerial = value => String(value || '').trim().toUpperCase();
    const { data: loanRows, error: loanErr } = await supabase.from('loan_applications')
      .select(`id, application_no, loan_account_no, application_status, physical_register_serial_no, ledger_no, loan_amount_requested, submitted_at, created_at, customer_profiles(full_name, phone), vehicle_model_master(model_name)`)
      .not('loan_account_no', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (loanErr) return sendError(res, 500, 'Could not load loan cases');

    const applications = (loanRows || []).map(row => ({
      id: row.id,
      application_no: row.application_no,
      loan_account_no: row.loan_account_no,
      application_status: row.application_status,
      physical_register_serial_no: row.physical_register_serial_no || row.ledger_no || null,
      loan_amount_requested: row.loan_amount_requested,
      submitted_at: row.submitted_at,
      customer_name: row.customer_profiles?.full_name || null,
      customer_phone: row.customer_profiles?.phone || null,
      vehicle_model: row.vehicle_model_master?.model_name || null,
    }));
    const appIds = applications.map(a => a.id);
    let logs = [];
    if (appIds.length) {
      const { data } = await supabase.from('telecaller_call_logs').select('id, loan_application_id, outcome, notes, callback_at, called_at').eq('telecaller_id', session.user_id).in('loan_application_id', appIds).order('called_at', { ascending: false }).limit(500);
      logs = data || [];
    }
    const lastLog = {};
    for (const l of logs) if (!lastLog[l.loan_application_id]) lastLog[l.loan_application_id] = l;
    const today = new Date(); today.setHours(0,0,0,0);
    const callsToday = logs.filter(l => new Date(l.called_at) >= today).length;
    const callbacks = logs.filter(l => l.callback_at && new Date(l.callback_at) >= new Date()).length;
    return res.status(200).json({ success: true, visibility: 'all_loan_cases_except_field_executive', registers: registers || [], applications: applications.map(a => ({ ...a, last_call: lastLog[a.id] || null })), stats: { registers: (registers || []).length, queue: applications.length, calls_today: callsToday, callbacks } });
  } catch (err) {
    console.error('[tele-caller/dashboard] unhandled', err);
    return sendError(res, 500, 'Could not load Tele Caller dashboard');
  }
}
