// GET /api/tele-caller/dashboard
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireUserAuth(req, res, ['tele_caller']);
  if (!session) return;
  try {
    const supabase = getSupabase();
    const { data: registers, error: regErr } = await supabase.from('telecaller_registers')
      .select('id, register_serial_no, assigned_at, is_active')
      .eq('assigned_telecaller_id', session.user_id).eq('is_active', true)
      .order('updated_at', { ascending: false });
    if (regErr) return sendError(res, 500, 'Could not load assigned registers');

    // NBFC security: a Tele Caller sees only cases belonging to their active registers.
    const serials = (registers || []).map(r => String(r.register_serial_no || '').trim()).filter(Boolean);
    let loanRows = [];
    if (serials.length) {
      const { data, error } = await supabase.from('loan_applications')
        .select(`id, application_no, loan_account_no, application_status, physical_register_serial_no, ledger_no, loan_amount_requested, tenure_months, submitted_at, created_at, customer_id, customer_profiles(id, full_name, phone, address, city, state, pincode, pan, aadhaar_masked, occupation, monthly_income), vehicle_model_master(model_name)`)
        .in('physical_register_serial_no', serials).not('loan_account_no', 'is', null)
        .order('created_at', { ascending: false }).limit(2000);
      if (error) return sendError(res, 500, 'Could not load assigned loan cases');
      loanRows = data || [];
    }

    const applications = loanRows.map(row => ({
      id: row.id, application_no: row.application_no, loan_account_no: row.loan_account_no,
      application_status: row.application_status,
      physical_register_serial_no: row.physical_register_serial_no || row.ledger_no || null,
      loan_amount_requested: row.loan_amount_requested, tenure_months: row.tenure_months,
      submitted_at: row.submitted_at, customer_id: row.customer_id,
      customer: row.customer_profiles || null,
      customer_name: row.customer_profiles?.full_name || null,
      customer_phone: row.customer_profiles?.phone || null,
      vehicle_model: row.vehicle_model_master?.model_name || null,
    }));
    const appIds = applications.map(a => a.id);
    let logs = [], ptps = [];
    if (appIds.length) {
      const [logResp, ptpResp] = await Promise.all([
        supabase.from('telecaller_call_logs').select('id, loan_application_id, outcome, notes, callback_at, called_at').eq('telecaller_id', session.user_id).in('loan_application_id', appIds).order('called_at', { ascending: false }).limit(2000),
        supabase.from('telecaller_ptp').select('id, loan_application_id, promised_date, promised_amount, status, remarks, created_at, updated_at').eq('telecaller_id', session.user_id).in('loan_application_id', appIds).order('promised_date', { ascending: true }).limit(2000),
      ]);
      if (!logResp.error) logs = logResp.data || [];
      if (!ptpResp.error) ptps = ptpResp.data || [];
    }
    const lastLog = {}, histories = {};
    for (const l of logs) { if (!lastLog[l.loan_application_id]) lastLog[l.loan_application_id] = l; (histories[l.loan_application_id] ||= []).push(l); }
    const activePtp = {};
    for (const p of ptps) { if (!activePtp[p.loan_application_id] || p.created_at > activePtp[p.loan_application_id].created_at) activePtp[p.loan_application_id] = p; }

    const now = new Date();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate()+1);
    const endWeek = new Date(todayStart); endWeek.setDate(endWeek.getDate()+7);
    const callsToday = logs.filter(l => new Date(l.called_at) >= todayStart).length;
    const callbacksDue = logs.filter(l => l.callback_at && new Date(l.callback_at) <= now).length;
    const callbacksUpcoming = logs.filter(l => l.callback_at && new Date(l.callback_at) > now).length;
    const connected = logs.filter(l => l.outcome === 'connected').length;
    const ptpToday = ptps.filter(p => p.promised_date === todayStart.toISOString().slice(0,10) && p.status === 'open').length;
    const ptpAmount = ptps.filter(p => p.status === 'open').reduce((s,p)=>s+Number(p.promised_amount||0),0);
    const uncalled = applications.filter(a => !lastLog[a.id]).length;
    const queue = applications.map(a => ({ ...a, last_call: lastLog[a.id] || null, call_history: (histories[a.id] || []).slice(0,10), ptp: activePtp[a.id] || null }));
    const followups = queue.filter(a => a.last_call?.callback_at).sort((a,b)=>new Date(a.last_call.callback_at)-new Date(b.last_call.callback_at));
    const overdueCallbacks = followups.filter(a => new Date(a.last_call.callback_at) <= now);
    const upcomingCallbacks = followups.filter(a => new Date(a.last_call.callback_at) > now && new Date(a.last_call.callback_at) < endWeek);
    const ptpBroken = ptps.filter(p => p.status === 'open' && p.promised_date < todayStart.toISOString().slice(0,10));

    return res.status(200).json({ success:true, visibility:'assigned_active_registers_only', registers:registers||[], applications:queue,
      followups: followups.slice(0,100), overdue_callbacks: overdueCallbacks.slice(0,100), upcoming_callbacks: upcomingCallbacks.slice(0,100),
      ptp_broken: ptpBroken.slice(0,100), stats:{ registers:(registers||[]).length, queue:queue.length, calls_today:callsToday,
        callbacks:upcomingCallbacks.length, callbacks_due:overdueCallbacks.length, new_cases:uncalled, connected_today:logs.filter(l=>l.outcome==='connected'&&new Date(l.called_at)>=todayStart).length,
        ptp_today:ptpToday, ptp_amount:ptpAmount, connected_total:connected, total_calls:logs.length, ptp_broken:ptpBroken.length, contact_rate:logs.length ? Math.round(connected/logs.length*100) : 0 } });
  } catch (err) { console.error('[tele-caller/dashboard] unhandled', err); return sendError(res, 500, 'Could not load Tele Caller dashboard'); }
}
