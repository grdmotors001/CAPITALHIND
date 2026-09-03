// POST /api/users/login
//
// Login for `users` table roles other than admin: field_executive,
// tele_caller, customer, do (Disbursement Officer), team_leader. Admin has its own
// endpoint (/api/admin/login); this covers everyone else in that table.
// Body: { identifier, password } — identifier is phone or email.

import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { signToken, sendError, methodGuard } from '../_lib/auth.js';

const ALLOWED_ROLES = ['field_executive', 'tele_caller', 'customer', 'do', 'team_leader'];

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return sendError(res, 422, 'Username/mobile and password are required');
    }

    const supabase = getSupabase();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, phone, email, password_hash, role, is_active')
      .in('role', ALLOWED_ROLES)
      .eq('is_active', true)
      .or(`phone.eq.${identifier},email.eq.${identifier}`)
      .maybeSingle();

    if (error) {
      console.error('[users/login]', error.message);
      return sendError(res, 500, 'Login failed. Please try again.');
    }

    if (!user) {
      return sendError(res, 401, 'Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return sendError(res, 401, 'Invalid credentials');
    }

    const token = signToken({
      type: 'app_user',
      user_id: user.id,
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      token,
      role: user.role,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[users/login] unhandled', err);
    return sendError(res, 500, 'Login failed. Please try again.');
  }
}
