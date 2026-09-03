// POST /api/team-leader/assign-register
// Body: { register_serial_no, telecaller_id }
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireUserAuth(req, res, ['team_leader']);
  if (!session) return;
  try {
    const serial = String(req.body?.register_serial_no || '').trim().toUpperCase();
    const telecallerId = String(req.body?.telecaller_id || '').trim();
    if (!serial) return sendError(res, 422, 'Register / ledger serial number is required');
    if (serial.length > 50) return sendError(res, 422, 'Register serial number is too long');
    if (!telecallerId) return sendError(res, 422, 'Tele Caller is required');
    const supabase = getSupabase();
    const { data: telecaller } = await supabase.from('users').select('id, full_name, role, is_active').eq('id', telecallerId).maybeSingle();
    if (!telecaller || telecaller.role !== 'tele_caller' || !telecaller.is_active) return sendError(res, 422, 'Select an active Tele Caller');
    const { data, error } = await supabase.from('telecaller_registers').upsert({
      register_serial_no: serial,
      assigned_telecaller_id: telecallerId,
      assigned_by: session.user_id,
      assigned_at: new Date().toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'register_serial_no' }).select('id, register_serial_no, assigned_telecaller_id, assigned_by, assigned_at, is_active, created_at').single();
    if (error) {
      console.error('[team-leader/assign-register]', error.message);
      return sendError(res, 500, 'Could not assign register');
    }
    return res.status(200).json({ success: true, message: `Register ${serial} assigned to ${telecaller.full_name}.`, register: data });
  } catch (err) {
    console.error('[team-leader/assign-register] unhandled', err);
    return sendError(res, 500, 'Could not assign register');
  }
}
