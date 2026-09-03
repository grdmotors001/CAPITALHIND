// POST /api/admin/update-user
//
// Updates phone/email/is_active on a `users` row. Admin-only (JWT).
// Body: { id, phone, email, is_active }

import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { id, phone, email, is_active } = req.body || {};

    if (!id) return sendError(res, 422, 'id is required');
    if (phone !== undefined && phone !== '' && !/^\d{10}$/.test(phone)) {
      return sendError(res, 422, 'valid 10-digit phone is required');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendError(res, 422, 'email is invalid');
    }

    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email || null;
    if (typeof is_active === 'boolean') updates.is_active = is_active;

    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, full_name, phone, email, role, is_active, created_at')
      .single();

    if (error) {
      console.error('[admin/update-user]', error.message);
      if (error.code === '23505') {
        return sendError(res, 409, 'An account with this phone number already exists.');
      }
      return sendError(res, 500, 'Failed to update account.');
    }

    return res.status(200).json({
      success: true,
      message: 'Account updated.',
      user,
    });
  } catch (err) {
    console.error('[admin/update-user] unhandled', err);
    return sendError(res, 500, 'Failed to update account.');
  }
}
