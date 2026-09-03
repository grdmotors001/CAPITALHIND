// POST /api/customer/google-login
// Body: { credential }  — the ID token returned by Google Identity Services
// on the frontend (see src/pages/auth/Login.jsx).
//
// Verifies the token directly against Google's tokeninfo endpoint (no extra
// dependency needed). Requires GOOGLE_CLIENT_ID to be set on the server —
// must match VITE_GOOGLE_CLIENT_ID used on the frontend.
//
// Like OTP login, this only signs in an email that's already known from a
// loan application (customer_profiles) or a previous login — it will not
// silently create an account for any Gmail address that hits this endpoint.

import { getSupabase } from '../_lib/supabase.js';
import { signToken, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const { credential } = req.body || {};
    if (!credential) {
      return sendError(res, 422, 'Google credential missing');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return sendError(res, 500, 'Google login abhi configure nahi hua hai.');
    }

    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    const payload = await verifyRes.json().catch(() => ({}));

    if (!verifyRes.ok || payload.aud !== clientId) {
      return sendError(res, 401, 'Invalid Google login. Please try again.');
    }

    if (payload.email_verified !== 'true' && payload.email_verified !== true) {
      return sendError(res, 401, 'Google email verified nahi hai.');
    }

    const email = String(payload.email || '').toLowerCase();
    const googleSub = payload.sub;
    const name = payload.name || 'Customer';

    if (!email || !googleSub) {
      return sendError(res, 401, 'Invalid Google login. Please try again.');
    }

    const supabase = getSupabase();

    // Already linked to this Google account?
    let { data: user } = await supabase
      .from('users')
      .select('id, full_name, phone, email, role, is_active')
      .eq('google_sub', googleSub)
      .maybeSingle();

    if (!user) {
      // Same email as an existing customer login or a known loan applicant?
      const { data: byEmail } = await supabase
        .from('users')
        .select('id, full_name, phone, email, role, is_active')
        .ilike('email', email)
        .eq('role', 'customer')
        .maybeSingle();

      if (byEmail) {
        const { data: linked, error: linkError } = await supabase
          .from('users')
          .update({ google_sub: googleSub, auth_provider: 'google' })
          .eq('id', byEmail.id)
          .select('id, full_name, phone, email, role, is_active')
          .single();
        if (linkError) {
          console.error('[customer/google-login] link', linkError.message);
          return sendError(res, 500, 'Login failed. Please try again.');
        }
        user = linked;
      } else {
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('full_name, phone')
          .ilike('email', email)
          .limit(1)
          .maybeSingle();

        if (!profile) {
          return sendError(
            res,
            404,
            'Ye Gmail address hamare records mein nahi mila. Apne dealer ya branch se sampark karein.'
          );
        }

        const { data: created, error: createError } = await supabase
          .from('users')
          .insert({
            full_name: profile.full_name || name,
            phone: profile.phone,
            email,
            role: 'customer',
            auth_provider: 'google',
            google_sub: googleSub,
            is_active: true,
          })
          .select('id, full_name, phone, email, role, is_active')
          .single();

        if (createError) {
          console.error('[customer/google-login] create', createError.message);
          return sendError(res, 500, 'Account create nahi ho paya. Please try again.');
        }
        user = created;
      }
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
    console.error('[customer/google-login] unhandled', err);
    return sendError(res, 500, 'Login failed. Please try again.');
  }
}
