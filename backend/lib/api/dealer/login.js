// POST /api/dealer/login
// Body: { phone: "9999999999", password: "..." }
// Verifies against dealer_users.password_hash (bcrypt) and issues a JWT.

import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { signToken, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return sendError(res, 422, 'Phone and password are required');
    }

    const supabase = getSupabase();

    const { data: dealerUser, error } = await supabase
      .from('dealer_users')
      .select('id, dealer_id, full_name, phone, password_hash, role, is_active')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('[dealer/login]', error.message);
      return sendError(res, 500, 'Login failed. Please try again.');
    }

    if (!dealerUser || !dealerUser.is_active) {
      return sendError(res, 401, 'Invalid phone or password');
    }

    const passwordOk = await bcrypt.compare(password, dealerUser.password_hash);
    if (!passwordOk) {
      return sendError(res, 401, 'Invalid phone or password');
    }

    const token = signToken({
      type: 'dealer_user',
      dealer_user_id: dealerUser.id,
      dealer_id: dealerUser.dealer_id,
      role: dealerUser.role,
    });

    res.status(200).json({
      success: true,
      token,
      role: 'dealer',
      user: {
        id: dealerUser.id,
        full_name: dealerUser.full_name,
        phone: dealerUser.phone,
        dealer_id: dealerUser.dealer_id,
      },
    });
  } catch (err) {
    // Catches things like missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY /
    // JWT_SECRET env vars, or any other unexpected throw, so the client
    // always gets valid JSON back instead of Vercel's plain-text crash page.
    console.error('[dealer/login] unhandled', err);
    return sendError(res, 500, 'Login failed. Please try again.');
  }
}
