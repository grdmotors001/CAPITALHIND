// GET/POST /api/field-executive/repossession
// Field Executive records a vehicle repossession ("Repo") against an assigned loan.
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

async function canAccessLoan(supabase, loan, session) {
  if (loan.assigned_fe_id === session.user_id) return true;
  if (loan.assigned_fe_id) return false;
  const { data: me, error: meErr } = await supabase
    .from('users').select('id, full_name, role, is_active').eq('id', session.user_id).maybeSingle();
  if (meErr || !me || me.role !== 'field_executive' || !me.is_active || !me.full_name) return false;
  const { data: matches, error } = await supabase
    .from('users').select('id').eq('role', 'field_executive').eq('is_active', true).ilike('full_name', me.full_name);
  if (error || (matches || []).length !== 1 || matches[0].id !== session.user_id) return false;
  return String(loan.fi_executive_name || '').trim().toLowerCase() === String(me.full_name).trim().toLowerCase();
}

export default async function handler(req, res) {
  const session = requireUserAuth(req, res, ['field_executive']);
  if (!session) return;
  try {
    const s = getSupabase();
    if (req.method === 'GET') {
      const [{ data: batteries, error: bErr }, { data: dealers, error: dErr }, { data: repos, error: rErr }] = await Promise.all([
        s.from('battery_master').select('id,battery_name').eq('is_active', true).order('battery_name'),
        s.from('dealer_master').select('id,dealer_name,dealer_code').eq('is_active', true).order('dealer_name'),
        s.from('vehicle_repossessions').select(`id,loan_application_id,repo_date,repo_time,vehicle_no,battery_available,battery_no,battery_master_id,rc_available,charger_available,parked_dealer_id,remarks,created_at,battery_master(battery_name),dealer_master(dealer_name),loan_applications(application_no,loan_account_no,customer_profiles(full_name,phone))`).eq('seized_by_fe_id', session.user_id).order('created_at', { ascending: false }).limit(200),
      ]);
      if (bErr || dErr || rErr) {
        console.error('[field-executive/repossession GET]', bErr?.message || dErr?.message || rErr?.message);
        return sendError(res, 500, 'Could not load Repo options/history.');
      }
      return res.status(200).json({ success: true, batteries: batteries || [], dealers: dealers || [], repossessions: repos || [] });
    }
    if (!methodGuard(req, res, 'POST')) return;
    const body = req.body || {};
    const loan_application_id = Number(body.loan_application_id);
    const vehicle_no = String(body.vehicle_no || '').trim().toUpperCase();
    const repo_date = String(body.repo_date || '').trim();
    const repo_time = String(body.repo_time || '').trim();
    const battery_available = body.battery_available === true || body.battery_available === 'true';
    const rc_available = body.rc_available === true || body.rc_available === 'true';
    const charger_available = body.charger_available === true || body.charger_available === 'true';
    const battery_no = String(body.battery_no || '').trim();
    const battery_master_id = body.battery_master_id ? Number(body.battery_master_id) : null;
    const parked_dealer_id = body.parked_dealer_id ? Number(body.parked_dealer_id) : null;
    const remarks = String(body.remarks || '').trim();

    if (!Number.isInteger(loan_application_id) || !vehicle_no || !repo_date || !repo_time || !parked_dealer_id) {
      return sendError(res, 422, 'Loan, Repo date/time, Vehicle No. and parked Dealer are required.');
    }
    if (battery_available && (!battery_master_id || !battery_no)) {
      return sendError(res, 422, 'Battery No. and Battery Name are required when Battery = Yes.');
    }
    if (!battery_available && (battery_no || battery_master_id)) {
      return sendError(res, 422, 'Do not enter battery details when Battery = No.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(repo_date) || !/^\d{2}:\d{2}$/.test(repo_time)) {
      return sendError(res, 422, 'Repo date or time is invalid.');
    }

    const { data: loan, error: loanErr } = await s.from('loan_applications')
      .select('id,application_no,loan_account_no,application_status,case_status,assigned_fe_id,fi_executive_name,vehicle_no,customer_profiles(full_name,phone)')
      .eq('id', loan_application_id).maybeSingle();
    if (loanErr) return sendError(res, 500, 'Could not verify loan.');
    if (!loan) return sendError(res, 404, 'Loan not found.');
    if (!(await canAccessLoan(s, loan, session))) return sendError(res, 403, 'This loan is not assigned to you.');
    if (!['approved', 'sanctioned', 'disbursed'].includes(loan.application_status)) {
      return sendError(res, 422, 'Repo can be recorded only for approved, sanctioned, or disbursed loans.');
    }
    if (loan.case_status === 'vehicle_seized') return sendError(res, 409, 'Repo is already recorded for this loan.');

    const [{ data: battery, error: batteryErr }, { data: dealer, error: dealerErr }] = await Promise.all([
      battery_available ? s.from('battery_master').select('id,battery_name').eq('id', battery_master_id).eq('is_active', true).maybeSingle() : Promise.resolve({ data: null, error: null }),
      s.from('dealer_master').select('id,dealer_name').eq('id', parked_dealer_id).eq('is_active', true).maybeSingle(),
    ]);
    if (batteryErr || (battery_available && !battery)) return sendError(res, 422, 'Selected Battery master is invalid.');
    if (dealerErr || !dealer) return sendError(res, 422, 'Selected parked Dealer is invalid.');

    const { data: repo, error: repoErr } = await s.from('vehicle_repossessions').insert({
      loan_application_id, repo_date, repo_time, seized_by_fe_id: session.user_id, vehicle_no,
      battery_available, battery_no: battery_available ? battery_no : null,
      battery_master_id: battery_available ? battery_master_id : null,
      rc_available, charger_available, parked_dealer_id, remarks: remarks || null,
    }).select('id,loan_application_id,repo_date,repo_time,vehicle_no,battery_available,battery_no,battery_master_id,rc_available,charger_available,parked_dealer_id,remarks,created_at').single();
    if (repoErr) {
      console.error('[field-executive/repossession insert]', repoErr.message);
      if (repoErr.code === '23505') return sendError(res, 409, 'Repo is already recorded for this loan.');
      return sendError(res, 500, 'Could not save Repo record.');
    }

    const seizedAt = new Date().toISOString();
    const { error: loanUpdateErr } = await s.from('loan_applications').update({
      case_status: 'vehicle_seized', vehicle_seized_at: seizedAt, vehicle_no,
    }).eq('id', loan_application_id);
    if (loanUpdateErr) {
      console.error('[field-executive/repossession loan update]', loanUpdateErr.message);
      await s.from('vehicle_repossessions').delete().eq('id', repo.id);
      return sendError(res, 500, 'Repo saved but loan status could not be updated. Please retry.');
    }
    await s.from('application_status_history').insert({ loan_application_id, from_status: loan.case_status || null, to_status: 'vehicle_seized', changed_by: null, changed_by_type: 'field_executive', remarks: `Vehicle Repo recorded by FI ${session.user_id}. Parked at ${dealer.dealer_name}.` });

    return res.status(200).json({ success: true, message: 'Vehicle Repo recorded successfully.', repo: { ...repo, battery_name: battery?.battery_name || null, dealer_name: dealer.dealer_name, fe_user_id: session.user_id } });
  } catch (err) {
    console.error('[field-executive/repossession] unhandled', err);
    return sendError(res, 500, 'Could not process Vehicle Repo.');
  }
}
