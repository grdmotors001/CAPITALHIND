// POST /api/team-leader/unassign-register
// Body: { id }
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireUserAuth(req, res, ['team_leader']);
  if (!session) return;
  try {
    const id = String(req.body?.id || '').trim();
    if (!id) return sendError(res, 422, 'Register id is required');
    const supabase = getSupabase();
    const { error } = await supabase.from('telecaller_registers').update({ assigned_telecaller_id: null, assigned_by: session.user_id, assigned_at: null, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return sendError(res, 500, 'Could not unassign register');
    return res.status(200).json({ success: true, message: 'Register unassigned.' });
  } catch (err) {
    console.error('[team-leader/unassign-register] unhandled', err);
    return sendError(res, 500, 'Could not unassign register');
  }
}
