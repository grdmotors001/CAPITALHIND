// Hobby-plan grouped Vercel Function. One function per API domain/role.
import route_login_0 from '../lib/api/users/login.js';
import route_profile_1 from '../lib/api/users/profile.js';
import route_change_password_2 from '../lib/api/users/change-password.js';

const routes = {
  '/login': route_login_0,
  '/profile': route_profile_1,
  '/change-password': route_change_password_2,
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
