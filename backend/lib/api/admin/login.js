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

    const { data: adminUser, error } = await supabase
      .from('users')
      .select(
        'id, full_name, phone, email, password_hash, role, is_active'
      )
      .eq('role', 'admin')
      .eq('is_active', true)
      .or(`phone.eq.${identifier},email.eq.${identifier}`)
      .maybeSingle();

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