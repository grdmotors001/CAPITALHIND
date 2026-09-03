// api/_lib/sms.js
//
// Pluggable OTP SMS sender. No provider is wired up yet, so by default this
// just logs the OTP to the Vercel function log (fine for testing — you can
// watch `vercel logs` or the Vercel dashboard and read the OTP there).
//
// To go live, pick ONE SMS provider and set env vars — nothing else in the
// codebase needs to change:
//
//   SMS_PROVIDER=msg91
//     MSG91_AUTH_KEY=...
//     MSG91_SENDER_ID=CHFPL      (6-char DLT-approved sender id)
//     MSG91_TEMPLATE_ID=...      (DLT-approved OTP template id)
//
//   SMS_PROVIDER=twilio
//     TWILIO_ACCOUNT_SID=...
//     TWILIO_AUTH_TOKEN=...
//     TWILIO_FROM_NUMBER=+1...
//
// Recommendation for an India-only lending app: MSG91 — it's built for the
// Indian DLT/TRAI SMS-consent regime, cheap per-SMS, and has a dedicated OTP
// template API. Twilio Verify is the pick if you also need international
// numbers or want the OTP-storage/rate-limiting handled for you instead of
// the otp_codes table below.

const PROVIDER = (process.env.SMS_PROVIDER || 'console').toLowerCase();

export async function sendOtpSms(phone, otp) {
  switch (PROVIDER) {
    case 'msg91':
      return sendViaMsg91(phone, otp);
    case 'twilio':
      return sendViaTwilio(phone, otp);
    default:
      // Dev fallback — no SMS provider configured yet.
      console.log(`[sms:console] OTP for ${phone} is ${otp} (SMS_PROVIDER not set — this is only logged, not sent)`);
      return { ok: true, provider: 'console' };
  }
}

async function sendViaMsg91(phone, otp) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID || 'CHFPL';

  if (!authKey || !templateId) {
    throw new Error('MSG91_AUTH_KEY / MSG91_TEMPLATE_ID env vars are not set');
  }

  const res = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body: JSON.stringify({
      template_id: templateId,
      mobile: `91${phone}`,
      otp,
      sender: senderId,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.type === 'error') {
    throw new Error(data.message || 'MSG91 send failed');
  }
  return { ok: true, provider: 'msg91' };
}

async function sendViaTwilio(phone, otp) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER env vars are not set');
  }

  const body = new URLSearchParams({
    To: `+91${phone}`,
    From: from,
    Body: `${otp} is your Capital Hind Finance login OTP. Valid for 5 minutes. Do not share it with anyone.`,
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Twilio send failed');
  }
  return { ok: true, provider: 'twilio' };
}

export function generateOtp() {
  // 6-digit numeric OTP, e.g. "042817" — keep leading zeros.
  return String(Math.floor(100000 + Math.random() * 900000));
}
