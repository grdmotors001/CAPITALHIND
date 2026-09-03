// POST /api/admin/masters/update-loan-type
// Body: { id, loan_type_name?, description?, is_active? }
// Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { id, loan_type_name, description, is_active } = req.body || {};
    if (!id) return sendError(res, 422, 'id is required');

    const patch = {};
    if (loan_type_name !== undefined) {
      if (!String(loan_type_name).trim()) return sendError(res, 422, 'loan_type_name cannot be empty');
      patch.loan_type_name = loan_type_name.trim();
    }
    if (description !== undefined) patch.description = description || null;
    if (is_active !== undefined) patch.is_active = !!is_active;

    const supabase = getSupabase();
    const { data: item, error } = await supabase
      .from('loan_type_master')
      .update(patch)
      .eq('id', id)
      .select('id, loan_type_name, description, is_active, created_at')
      .single();

    if (error) {
      console.error('[admin/masters/update-loan-type]', error.message);
      if (error.code === '23505') {
        return sendError(res, 409, 'A loan type with this name already exists.');
      }
      return sendError(res, 500, 'Failed to update loan type.');
    }

    return res.status(200).json({ success: true, message: 'Loan type updated.', item });
  } catch (err) {
    console.error('[admin/masters/update-loan-type] unhandled', err);
    return sendError(res, 500, 'Failed to update loan type.');
  }
}
