// GET /api/team-leader/overview
// Team Leader: active Tele Callers + physical register/ledger assignments.
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireUserAuth(req, res, ['team_leader']);
  if (!session) return;
  try {
    const supabase = getSupabase();
    const [{ data: telecallers, error: tcErr }, { data: registers, error: regErr }] = await Promise.all([
      supabase.from('users').select('id, full_name, phone, email, is_active').eq('role', 'tele_caller').eq('is_active', true).order('full_name'),
      supabase.from('telecaller_registers').select('id, register_serial_no, assigned_telecaller_id, assigned_by, assigned_at, is_active, created_at').eq('is_active', true).order('updated_at', { ascending: false }),
    ]);
    if (tcErr || regErr) {
      console.error('[team-leader/overview]', tcErr?.message || regErr?.message);
      return sendError(res, 500, 'Could not load team data');
    }
    const ids = [...new Set((registers || []).map(r => r.assigned_telecaller_id).filter(Boolean))];
    const names = {};
    if (ids.length) {
      const { data } = await supabase.from('users').select('id, full_name').in('id', ids);
      for (const u of data || []) names[u.id] = u.full_name;
    }
    const normalizeSerial = value => String(value || '').trim().toUpperCase();
    const existingSerials = (registers || []).map(r => normalizeSerial(r.register_serial_no)).filter(Boolean);
    const { data: loanRows, error: loanErr } = await supabase.from('loan_applications').select('physical_register_serial_no').not('physical_register_serial_no', 'is', null);
    if (loanErr) {
      console.error('[team-leader/overview] loan register query', loanErr.message);
      return sendError(res, 500, 'Could not load loan register data');
    }
    const loanCounts = {};
    for (const row of loanRows || []) {
      const serial = normalizeSerial(row.physical_register_serial_no);
      if (serial) loanCounts[serial] = (loanCounts[serial] || 0) + 1;
    }
    const allSerials = [...new Set([...existingSerials, ...Object.keys(loanCounts)])];
    const assignedBySerial = {};
    for (const r of registers || []) assignedBySerial[normalizeSerial(r.register_serial_no)] = r;
    const mergedRegisters = allSerials.map(serial => assignedBySerial[serial] || ({
      id: `loan-register-${serial}`, register_serial_no: serial, assigned_telecaller_id: null,
      assigned_by: null, assigned_at: null, is_active: true, created_at: null, updated_at: null
    }));
    const assigned = mergedRegisters.map(r => ({ ...r, register_serial_no: normalizeSerial(r.register_serial_no), telecaller_name: names[r.assigned_telecaller_id] || null, loan_count: loanCounts[normalizeSerial(r.register_serial_no)] || 0 }));
    const availableRegisters = assigned.map(r => ({ register_serial_no: r.register_serial_no, loan_count: r.loan_count, assigned_telecaller_id: r.assigned_telecaller_id })).sort((a,b) => String(a.register_serial_no).localeCompare(String(b.register_serial_no)));
    return res.status(200).json({ success: true, telecallers: telecallers || [], registers: assigned, available_registers: availableRegisters });
  } catch (err) {
    console.error('[team-leader/overview] unhandled', err);
    return sendError(res, 500, 'Could not load team data');
  }
}
