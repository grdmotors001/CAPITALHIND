// POST /api/admin/staff/update
// Updates contact details for a staff account.
import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { id, contact_mobile, email } = req.body || {};
    if (!id) return sendError(res, 422, 'id is required.');
    if (contact_mobile !== undefined && contact_mobile !== '' && !/^\d{10}$/.test(String(contact_mobile))) {
      return sendError(res, 422, 'Mobile must be a valid 10-digit number.');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return sendError(res, 422, 'Email is invalid.');
    }

    const updates = {};
    if (contact_mobile !== undefined) updates.contact_mobile = String(contact_mobile).trim() || null;
    if (email !== undefined) updates.email = String(email).trim().toLowerCase() || null;

    const supabase = getSupabase();
    const { data, error } = await supabase.from('staff_accounts')
      .update(updates)
      .eq('id', id)
      .select('id, username, contact_mobile, email, role, is_active, created_at')
      .maybeSingle();

    if (error) {
      console.error('[admin/staff/update]', error.message);
      if (error.code === '23505') return sendError(res, 409, 'Another account already uses this mobile or email.');
      return sendError(res, 500, 'Failed to update staff account.');
    }
    if (!data) return sendError(res, 404, 'Staff account not found.');

    return res.status(200).json({ success: true, message: 'Staff contact details updated.', user: data });
  } catch (err) {
    console.error('[admin/staff/update] unhandled', err);
    return sendError(res, 500, 'Failed to update staff account.');
  }
}
