// POST /api/admin/create-user
//
// Creates a new account in the `users` table — the same table used by
// /api/admin/login and RoleGuard for field_executive / tele_caller /
// customer / admin logins (see supabase/migrations/0001_init.sql).
// Admin-only (JWT).
//
// Body: { full_name, phone, password, role, email? }

import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

const ALLOWED_ROLES = ['field_executive', 'tele_caller', 'customer', 'admin', 'do', 'team_leader'];

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { full_name, phone, password, role, email } = req.body || {};

    const errors = [];
    if (!full_name || !String(full_name).trim()) errors.push('full_name is required');
    if (role === 'admin') {
      if (phone && !/^\d{10}$/.test(phone)) errors.push('phone must be a valid 10-digit number');
      if (!phone && !email) errors.push('admin account needs a phone number or email');
    } else if (!phone || !/^\d{10}$/.test(phone)) {
      errors.push('valid 10-digit phone is required');
    }
    if (!password || String(password).length < 8) errors.push('password must be at least 8 characters');
    if (!role || !ALLOWED_ROLES.includes(role)) {
      errors.push(`role must be one of: ${ALLOWED_ROLES.join(', ')}`);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email is invalid');

    if (errors.length) {
      return res.status(422).json({ success: false, error: errors.join(', ') });
    }

    const supabase = getSupabase();
    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        full_name: full_name.trim(),
        phone: phone || null,
        email: email || null,
        password_hash,
        role,
        is_active: true,
      })
      .select('id, full_name, phone, email, role, is_active, created_at')
      .single();

    if (error) {
      console.error('[admin/create-user]', error.message);
      if (error.code === '23505') {
        return sendError(res, 409, 'An account with this phone number already exists.');
      }
      return sendError(res, 500, 'Failed to create account.');
    }

    return res.status(200).json({
      success: true,
      message: 'Account created successfully.',
      user,
    });
  } catch (err) {
    console.error('[admin/create-user] unhandled', err);
    return sendError(res, 500, 'Failed to create account.');
  }
}
