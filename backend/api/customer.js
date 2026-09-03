// Hobby-plan grouped Vercel Function. One function per API domain/role.
import route_google_login_0 from '../lib/api/customer/google-login.js';
import route_my_loans_1 from '../lib/api/customer/my-loans.js';
import route_request_otp_2 from '../lib/api/customer/request-otp.js';
import route_verify_otp_3 from '../lib/api/customer/verify-otp.js';

const routes = {
  '/google-login': route_google_login_0,
  '/my-loans': route_my_loans_1,
  '/request-otp': route_request_otp_2,
  '/verify-otp': route_verify_otp_3,
};

export default async function handler(req, res) {
  const rawPath = req.query?.path;
  const routePath = '/' + (Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '').replace(/^\/+|\/+$/g, ''));
  const route = routes[routePath];

  if (!route) {
    return res.status(404).json({ success: false, error: `API route not found: ${routePath}` });
  }

  return route(req, res);
}
