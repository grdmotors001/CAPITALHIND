// GET /api/admin/masters/list-loan-types
// Lists Loan Type master records. Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('loan_type_master')
      .select('id, loan_type_name, description, is_active, created_at')
      .order('loan_type_name', { ascending: true });

    if (error) {
      console.error('[admin/masters/list-loan-types]', error.message);
      return sendError(res, 500, 'Failed to load loan type master.');
    }

    return res.status(200).json({ success: true, items: data || [] });
  } catch (err) {
    console.error('[admin/masters/list-loan-types] unhandled', err);
    return sendError(res, 500, 'Failed to load loan type master.');
  }
}
