// POST /api/customer/request-otp
// Body: { phone }  — 10-digit Indian mobile number, no country code.
//
// Only phone numbers that already exist in `customer_profiles` (i.e. a
// dealer has actually filed a loan application for this person) can log in.
// This stops a random phone number from self-registering a customer
// account. If your business wants open self-signup instead, remove the
// customer_profiles lookup below.

import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { sendError, methodGuard } from '../_lib/auth.js';
import { sendOtpSms, generateOtp } from '../_lib/sms.js';

const OTP_TTL_MINUTES = 5;
const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MINUTES = 10;

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const { phone } = req.body || {};

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return sendError(res, 422, 'Valid 10-digit mobile number required');
    }

    const supabase = getSupabase();

    // Must belong to a known customer (loan filed by a dealer) OR an
    // already-provisioned customer login account.
    const { data: knownProfile } = await supabase
      .from('customer_profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1)
      .maybeSingle();

    const { data: knownUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .eq('role', 'customer')
      .limit(1)
      .maybeSingle();

    if (!knownProfile && !knownUser) {
      return sendError(res, 404, 'Ye mobile number hamare records mein nahi mila. Apne dealer ya branch se sampark karein.');
    }

    // Rate-limit: max MAX_REQUESTS_PER_WINDOW OTP requests per phone per window.
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('created_at', windowStart);

    if ((count || 0) >= MAX_REQUESTS_PER_WINDOW) {
      return sendError(res, 429, 'Bahut zyada attempts. Kripya kuch der baad try karein.');
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('otp_codes').insert({
      phone,
      otp_hash: otpHash,
      purpose: 'customer_login',
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('[customer/request-otp] insert', insertError.message);
      return sendError(res, 500, 'OTP bhejne mein dikkat hui. Dobara try karein.');
    }

    await sendOtpSms(phone, otp);

    return res.status(200).json({
      success: true,
      message: `OTP bhej diya gaya hai ${phone} par. ${OTP_TTL_MINUTES} minute tak valid hai.`,
      expires_in_seconds: OTP_TTL_MINUTES * 60,
    });
  } catch (err) {
    console.error('[customer/request-otp] unhandled', err);
    return sendError(res, 500, 'OTP bhejne mein dikkat hui. Dobara try karein.');
  }
}
