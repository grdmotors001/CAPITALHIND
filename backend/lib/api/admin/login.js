import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { signToken, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return sendError(
        res,
        422,
        'Username/mobile and password are required'
      );
    }

    const supabase = getSupabase();

    const loginId = String(identifier).trim();
    const normalizedPhone =
      /^\+91\d{10}$/.test(loginId) ? loginId.slice(3) :
      /^91\d{10}$/.test(loginId) ? loginId.slice(2) :
      loginId;

    // Admin UI accepts username / mobile / email. Admin users are stored in
    // public.users, where the legacy "username" is represented by full_name.
    // Keep the lookups separate so special characters in a username/email
    // cannot break a Supabase filter expression.
    let adminUser = null;
    let error = null;

    const lookup = async (column, value) => {
      const result = await supabase
        .from('users')
        .select('id, full_name, phone, email, password_hash, role, is_active')
        .eq('role', 'admin')
        .eq('is_active', true)
        .eq(column, value)
        .limit(1)
        .maybeSingle();
      if (result.error) error = result.error;
      return result.data;
    };

    if (/^\d{10}$/.test(normalizedPhone)) {
      adminUser = await lookup('phone', normalizedPhone);
    } else if (loginId.includes('@')) {
      adminUser = await lookup('email', loginId.toLowerCase());
    } else {
      adminUser = await lookup('full_name', loginId);
    }

    if (error) {
      console.error('[admin/login]', error.message);
      return sendError(res, 500, 'Login failed. Please try again.');
    }

    if (!adminUser) {
      return sendError(res, 401, 'Invalid admin credentials');
    }

    const passwordOk = await bcrypt.compare(
      password,
      adminUser.password_hash
    );

    if (!passwordOk) {
      return sendError(res, 401, 'Invalid admin credentials');
    }

    const token = signToken({
      type: 'admin_user',
      user_id: adminUser.id,
      role: 'admin',
    });

    return res.status(200).json({
      success: true,
      token,
      role: 'admin',
      user: {
        id: adminUser.id,
        full_name: adminUser.full_name,
        phone: adminUser.phone,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (err) {
    console.error('[admin/login] unhandled', err);

    return sendError(
      res,
      500,
      'Login failed. Please try again.'
    );
  }
}