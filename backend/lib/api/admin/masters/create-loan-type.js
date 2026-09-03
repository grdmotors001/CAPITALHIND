// POST /api/admin/masters/create-loan-type
// Body: { loan_type_name, description? }
// Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { loan_type_name, description } = req.body || {};

    if (!loan_type_name || !String(loan_type_name).trim()) {
      return res.status(422).json({ success: false, error: 'loan_type_name is required' });
    }

    const supabase = getSupabase();

    const { data: item, error } = await supabase
      .from('loan_type_master')
      .insert({
        loan_type_name: loan_type_name.trim(),
        description: description || null,
        is_active: true,
      })
      .select('id, loan_type_name, description, is_active, created_at')
      .single();

    if (error) {
      console.error('[admin/masters/create-loan-type]', error.message);
      if (error.code === '23505') {
        return sendError(res, 409, 'A loan type with this name already exists.');
      }
      return sendError(res, 500, 'Failed to create loan type.');
    }

    return res.status(200).json({ success: true, message: 'Loan type created.', item });
  } catch (err) {
    console.error('[admin/masters/create-loan-type] unhandled', err);
    return sendError(res, 500, 'Failed to create loan type.');
  }
}
