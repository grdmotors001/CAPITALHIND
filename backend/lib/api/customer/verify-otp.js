// POST /api/customer/verify-otp
// Body: { phone, otp }
//
// On success, finds (or auto-provisions) the `users` row for this phone
// with role='customer' and returns a JWT — same response shape as
// /api/users/login so the existing frontend token/session helpers work
// unchanged.

import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { signToken, sendError, methodGuard } from '../_lib/auth.js';

const MAX_ATTEMPTS = 5;

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const { phone, otp } = req.body || {};

    if (!phone || !/^[6-9]\d{9}$/.test(phone) || !otp) {
      return sendError(res, 422, 'Mobile number aur OTP dono required hain');
    }

    const supabase = getSupabase();

    const { data: otpRow, error: otpError } = await supabase
      .from('otp_codes')
      .select('id, otp_hash, attempts, expires_at, consumed_at')
      .eq('phone', phone)
      .eq('purpose', 'customer_login')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error('[customer/verify-otp] lookup', otpError.message);
      return sendError(res, 500, 'Verification failed. Please try again.');
    }

    if (!otpRow || otpRow.consumed_at) {
      return sendError(res, 401, 'OTP expire ho chuka hai. Naya OTP mangwayein.');
    }

    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return sendError(res, 401, 'OTP expire ho chuka hai. Naya OTP mangwayein.');
    }

    if (otpRow.attempts >= MAX_ATTEMPTS) {
      return sendError(res, 429, 'Bahut zyada galat attempts. Naya OTP mangwayein.');
    }

    const otpOk = await bcrypt.compare(otp, otpRow.otp_hash);

    if (!otpOk) {
      await supabase
        .from('otp_codes')
        .update({ attempts: otpRow.attempts + 1 })
        .eq('id', otpRow.id);
      return sendError(res, 401, 'Galat OTP. Dobara try karein.');
    }

    await supabase
      .from('otp_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', otpRow.id);

    // Find-or-create the login account for this phone.
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, phone, email, role, is_active')
      .eq('phone', phone)
      .eq('role', 'customer')
      .maybeSingle();

    if (userError) {
      console.error('[customer/verify-otp] user lookup', userError.message);
      return sendError(res, 500, 'Login failed. Please try again.');
    }

    if (!user) {
      // Pull the name from an existing loan record if this is a first-time
      // login, so we don't create an account with no name on it.
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('full_name, email')
        .eq('phone', phone)
        .limit(1)
        .maybeSingle();

      const { data: created, error: createError } = await supabase
        .from('users')
        .insert({
          full_name: profile?.full_name || 'Customer',
          phone,
          email: profile?.email || null,
          role: 'customer',
          auth_provider: 'otp',
          is_active: true,
        })
        .select('id, full_name, phone, email, role, is_active')
        .single();

      if (createError) {
        console.error('[customer/verify-otp] user create', createError.message);
        return sendError(res, 500, 'Account create nahi ho paya. Please try again.');
      }
      user = created;
    }

    if (!user.is_active) {
      return sendError(res, 403, 'Ye account deactivate hai. Branch se sampark karein.');
    }

    const token = signToken({ type: 'app_user', user_id: user.id, role: user.role });

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
    console.error('[customer/verify-otp] unhandled', err);
    return sendError(res, 500, 'Login failed. Please try again.');
  }
}
