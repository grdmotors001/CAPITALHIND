// Customer login helpers: mobile OTP + Google Sign-In.
// Uses the same token storage as field-executive/tele-caller/do logins
// (src/utils/appUserAuth.js) so RoleGuard / session.js work unchanged.

import { setAppUserToken } from './appUserAuth';

const BASE = '/api/customer';

async function postJson(path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function requestCustomerOtp(phone) {
  return postJson('request-otp', { phone });
}

export async function verifyCustomerOtp(phone, otp) {
  const data = await postJson('verify-otp', { phone, otp });
  setAppUserToken(data.token);
  return data;
}

export async function loginCustomerWithGoogle(credential) {
  const data = await postJson('google-login', { credential });
  setAppUserToken(data.token);
  return data;
}
